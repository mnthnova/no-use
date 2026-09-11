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

# Register all possible custom or standard tags so docutils never crashes
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
    
    en_nodes = extract_text_nodes(english_file)
    ja_nodes = extract_text_nodes(japanese_file)
    
    with open(japanese_file, 'r', encoding='utf-8') as f:
        raw_ja_text = f.read()

    matcher = difflib.SequenceMatcher(None, en_nodes, ja_nodes)
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'replace':
            for en_idx, ja_idx in zip(range(i1, i2), range(j1, j2)):
                old_ja = ja_nodes[ja_idx]
                new_en = en_nodes[en_idx]
                translated = get_translation(new_en)
                if old_ja != translated and (old_ja == new_en or old_ja in raw_ja_text):
                    print(f"[UPDATE] Replacing text block safely.")
                    raw_ja_text = raw_ja_text.replace(old_ja, translated, 1)
                    
        elif tag == 'insert':
            print(f"[INSERTION] New line detected in English structure.")
            for en_idx in range(i1, i2):
                new_en = en_nodes[en_idx]
                translated = get_translation(new_en)
                if en_idx > 0:
                    prev_en = en_nodes[en_idx - 1]
                    if prev_en in raw_ja_text:
                        print(f"[INSERT] Injecting new translated line.")
                        raw_ja_text = raw_ja_text.replace(prev_en, prev_en + "\n\n" + translated, 1)

    with open(japanese_file, 'w', encoding='utf-8') as f:
        f.write(raw_ja_text)
    print(f"[SUCCESS] {japanese_file} synchronized completely.")

def get_git_modified_files():
    try:
        diff_output = subprocess.check_output(['git', 'diff', '--name-only', 'HEAD~1', 'HEAD'], text=True)
        return [line.strip() for line in diff_output.splitlines() if line.startswith('content/') and line.endswith('.rst')]
    except Exception:
        # Fallback if git HEAD~1 isn't available in pipeline, check untracked/modified
        try:
            status_output = subprocess.check_output(['git', 'status', '--porcelain'], text=True)
            files = []
            for line in status_output.splitlines():
                filepath = line[3:].strip()
                if filepath.startswith('content/') and filepath.endswith('.rst'):
                    files.append(filepath)
            return files
        except Exception:
            return []

def main():
    print("--- Starting Full AST Robust Sync ---")
    modified_files = get_git_modified_files()
    
    if not modified_files:
        print("[INFO] No modified RST files found in git diff.")
        return

    for en_file in modified_files:
        ja_file = en_file.replace('content/', 'content_ja/', 1)
        if os.path.exists(ja_file):
            process_file_sync(en_file, ja_file)
        else:
            print(f"[WARNING] Matching Japanese file not found for {en_file}")

if __name__ == "__main__":
    main()
