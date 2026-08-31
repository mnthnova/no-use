import subprocess
import os
import requests
import urllib3
from docutils.core import publish_doctree
from docutils import nodes
from docutils.parsers.rst import directives, Directive

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
INTERNAL_API_URL = "https://translator.tsip.intratmc.com/api/translate/text"

# ==========================================
# 1. SPHINX DIRECTIVE BYPASS
# Prevents docutils from crashing on custom tags
# ==========================================
class DummyDirective(Directive):
    has_content = True
    required_arguments = 0
    optional_arguments = 10
    final_argument_whitespace = True
    option_spec = {}
    
    def run(self):
        return [nodes.raw('', self.block_text, format='rst')]

# Register standard Sphinx tags you might manually add later
for tag in ['toctree', 'include', 'note', 'warning', 'code-block', 'list-table', 'image', 'figure']:
    directives.register_directive(tag, DummyDirective)

# ==========================================
# 2. TRANSLATION API
# ==========================================
def get_translation(text, from_lang="english", to_lang="japanese"):
    clean_text = text.strip()
    if not clean_text or clean_text.startswith(('.. ', '|')) or ' ' not in clean_text:
        return text

    print(f"  [API] Translating: {clean_text[:30]}...")
    payload = {"texts": [text], "from_lang": from_lang, "to_lang": to_lang}

    try:
        response = requests.post(
            INTERNAL_API_URL, json=payload, timeout=20, verify=False, 
            proxies={"http": None, "https": None}
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok" and data.get("texts"):
                return data["texts"][0]
    except Exception as e:
        print(f"  [API ERROR] Translation failed: {e}")

    return text

# ==========================================
# 3. AST MAPPING & INJECTION
# ==========================================
def extract_text_nodes(filepath):
    """Parses the RST and returns a flat list of all pure text strings in structural order."""
    if not os.path.exists(filepath):
        return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    try:
        # Build the AST without crashing on Sphinx tags
        tree = publish_doctree(content)
        # Extract every single text node in order
        return [node.astext() for node in tree.findall(nodes.Text)]
    except Exception as e:
        print(f"[AST ERROR] Could not parse {filepath}: {e}")
        return []

def get_git_diff_additions():
    """Extracts only the newly added/modified English strings from Git."""
    try:
        diff_output = subprocess.check_output(['git', 'diff', '-U0', 'HEAD~1', 'HEAD'], text=True)
    except subprocess.CalledProcessError:
        return {}

    changes = {}
    current_file = ""
    
    for line in diff_output.splitlines():
        if line.startswith('+++ b/'):
            current_file = line.replace('+++ b/', '')
            changes[current_file] = []
        elif line.startswith('+') and not line.startswith('+++'):
            clean_add = line[1:].strip()
            # Ignore empty lines or pure formatting artifacts
            if clean_add and not clean_add.startswith(('+', '-', '=')):
                changes[current_file].append(clean_add)
                
    return changes

def process_file_sync(english_file, japanese_file):
    print(f"\n[SYNC] Processing {english_file}")
    
    # 1. Get ordered lists of text from both current files
    en_nodes = extract_text_nodes(english_file)
    ja_nodes = extract_text_nodes(japanese_file)
    
    if len(en_nodes) != len(ja_nodes):
        print("[WARNING] Document structures do not match. A manual sync or full structural rebuild is required.")
        # Optional: You could trigger a full Pandoc rebuild of the JA file here if desired
        return

    # 2. Get the specific lines that were just modified in English
    additions = get_git_diff_additions().get(english_file, [])
    if not additions:
        print("[SKIP] No actionable text changes found.")
        return

    # 3. Read raw Japanese file for safe string replacement
    with open(japanese_file, 'r', encoding='utf-8') as f:
        raw_ja_text = f.read()

    # 4. Map the changes structurally
    for added_text in additions:
        # Find exactly which structural node contains the new English edit
        for i, en_text in enumerate(en_nodes):
            if added_text in en_text:
                old_ja_target = ja_nodes[i]
                
                # Double check we haven't already translated it
                if old_ja_target == added_text:
                    continue 

                new_ja_translation = get_translation(added_text, 'english', 'japanese')
                
                print(f"[AST MATCH] Found Node {i}. Replacing old Japanese text safely.")
                
                # Safely swap the exact text in the raw file, leaving Pandoc formatting untouched
                raw_ja_text = raw_ja_text.replace(old_ja_target, new_ja_translation, 1)
                
                # Update our in-memory node so subsequent edits in the same file don't desync
                ja_nodes[i] = new_ja_translation
                break

    # 5. Save the perfectly formatted file
    with open(japanese_file, 'w', encoding='utf-8') as f:
        f.write(raw_ja_text)
    print(f"[SUCCESS] {japanese_file} synced and formatted correctly.")

def main():
    diff_data = get_git_diff_additions()
    
    for modified_file in diff_data.keys():
        if modified_file.startswith('content/') and modified_file.endswith('.rst'):
            en_file = modified_file
            ja_file = modified_file.replace('content/', 'content_ja/', 1)
            process_file_sync(en_file, ja_file)

if __name__ == "__main__":
    print("--- Starting Hybrid AST Diff Sync ---")
    main()
