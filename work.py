import subprocess
import os
import requests
import urllib3
import difflib
from docutils.core import publish_doctree
from docutils import nodes
from docutils.parsers.rst import directives, Directive

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
INTERNAL_API_URL = ""

class DummyDirective(Directive):
    has_content = True
    required_arguments = 0
    optional_arguments = 10
    final_argument_whitespace = True
    option_spec = {}
    def run(self):
        return [nodes.raw('', self.block_text, format='rst')]

for tag in ['toctree', 'include', 'note', 'warning', 'code-block', 'list-table', 'image', 'figure', 'rubric']:
    directives.register_directive(tag, DummyDirective)

def get_translation(text):
    clean_text = text.strip()
    if not clean_text or clean_text.startswith(('.. ', '|')) or ' ' not in clean_text:
        return text
    print(f"  [API] Translating: {clean_text[:30]}...")
    payload = {"texts": [text], "from_lang": "english", "to_lang": "japanese"}
    try:
        response = requests.post(INTERNAL_API_URL, json=payload, timeout=20, verify=False, proxies={"http": None, "https": None})
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok" and data.get("texts"):
                return data["texts"][0]
    except Exception as e:
        print(f"  [API ERROR] {e}")
    return text

def extract_text_nodes(filepath):
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    try:
        tree = publish_doctree(content)
        return [node.astext() for node in tree.findall(nodes.Text)]
    except Exception as e:
        print(f"[AST ERROR] {filepath}: {e}")
        return []

def process_file_sync(english_file, japanese_file):
    print(f"\n[SYNC] Robust Processing: {english_file}")
    
    # We need the previous version of English (from git HEAD~1) to see what changed
    # For now, let's look at structural diffing between current EN and JA files using SequenceMatcher
    en_nodes = extract_text_nodes(english_file)
    ja_nodes = extract_text_nodes(japanese_file)
    
    with open(japanese_file, 'r', encoding='utf-8') as f:
        raw_ja_text = f.read()

    # SequenceMatcher finds blocks that match between English nodes and Japanese nodes structure
    # This aligns them even if lines were inserted!
    matcher = difflib.SequenceMatcher(None, en_nodes, ja_nodes)
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'replace':
            # Text was changed in these nodes
            for en_idx, ja_idx in zip(range(i1, i2), range(j1, j2)):
                old_ja = ja_nodes[ja_idx]
                new_en = en_nodes[en_idx]
                # If English changed text significantly, translate and replace
                translated = get_translation(new_en)
                if old_ja != translated and old_ja == new_en: # untranslated check
                    print(f"[UPDATE] Replacing '{old_ja[:15]}' with translated text.")
                    raw_ja_text = raw_ja_text.replace(old_ja, translated, 1)
                    
        elif tag == 'insert':
            # A brand new line/node was inserted in English!
            print(f"[INSERTION DETECTED] New content added in English.")
            for en_idx in range(i1, i2):
                new_en = en_nodes[en_idx]
                translated = get_translation(new_en)
                # Find where to anchor it using the surrounding nodes
                if en_idx > 0:
                    prev_en = en_nodes[en_idx - 1]
                    # We find where prev_en is in the raw Japanese text and insert right after it
                    if prev_en in raw_ja_text:
                        print(f"[INSERT] Injecting new translated line after context anchor.")
                        # Insert translated text followed by a newline
                        raw_ja_text = raw_ja_text.replace(prev_en, prev_en + "\n\n" + translated, 1)

    with open(japanese_file, 'w', encoding='utf-8') as f:
        f.write(raw_ja_text)
    print(f"[SUCCESS] {japanese_file} synchronized robustly.")
