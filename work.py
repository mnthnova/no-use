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

def get_old_git_content(filepath):
    """Extracts the file content from the previous commit to compare English vs English."""
    try:
        return subprocess.check_output(['git', 'show', f'HEAD~1:{filepath}'], text=True)
    except subprocess.CalledProcessError:
        print(f"[WARNING] Could not retrieve previous version of {filepath}. Is it a new file?")
        return ""

def extract_text_nodes_from_string(content):
    try:
        tree = publish_doctree(content)
        return [node.astext() for node in tree.findall(nodes.Text)]
    except Exception as e:
        print(f"[AST ERROR] String parsing failed: {e}")
        return []

def extract_text_nodes_from_file(filepath):
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        return extract_text_nodes_from_string(f.read())

def process_file_sync(english_file, japanese_file):
    print(f"\n[SYNC] Processing: {english_file}")
    
    # 1. Get OLD English nodes (from Git)
    old_en_content = get_old_git_content(english_file)
    if not old_en_content:
        return
    old_en_nodes = extract_text_nodes_from_string(old_en_content)
    
    # 2. Get NEW English nodes (Current file)
    new_en_nodes = extract_text_nodes_from_file(english_file)
    
    # 3. Get CURRENT Japanese nodes
    ja_nodes = extract_text_nodes_from_file(japanese_file)
    
    with open(japanese_file, 'r', encoding='utf-8') as f:
        raw_ja_text = f.read()

    # 4. Compare OLD English to NEW English (Apples to Apples)
    matcher = difflib.SequenceMatcher(None, old_en_nodes, new_en_nodes)
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'replace':
            # Text was edited
            for old_idx, new_idx in zip(range(i1, i2), range(j1, j2)):
                if old_idx < len(ja_nodes):
                    old_ja = ja_nodes[old_idx]
                    new_en = new_en_nodes[new_idx]
                    translated = get_translation(new_en)
                    
                    print(f"[UPDATE] Editing Node {old_idx}.")
                    raw_ja_text = raw_ja_text.replace(old_ja, translated, 1)
                    
        elif tag == 'insert':
            # Brand new line was added
            for new_idx in range(j1, j2):
                new_en = new_en_nodes[new_idx]
                translated = get_translation(new_en)
                
                # Anchor using the JAPANESE node that came right before the insertion
                anchor_idx = i1 - 1 
                if 0 <= anchor_idx < len(ja_nodes):
                    prev_ja = ja_nodes[anchor_idx]
                    if prev_ja in raw_ja_text:
                        print(f"[INSERT] Injecting new line after Japanese anchor.")
                        # Inject translated text with proper spacing
                        raw_ja_text = raw_ja_text.replace(prev_ja, prev_ja + "\n\n" + translated, 1)

    with open(japanese_file, 'w', encoding='utf-8') as f:
        f.write(raw_ja_text)
    print(f"[SUCCESS] {japanese_file} synchronized correctly.")

def get_git_modified_files():
    try:
        diff_output = subprocess.check_output(['git', 'diff', '--name-only', 'HEAD~1', 'HEAD'], text=True)
        return [line.strip() for line in diff_output.splitlines() if line.startswith('content/') and line.endswith('.rst')]
    except Exception:
        return []

def main():
    print("--- Starting Corrected AST Sync ---")
    modified_files = get_git_modified_files()
    
    for en_file in modified_files:
        ja_file = en_file.replace('content/', 'content_ja/', 1)
        if os.path.exists(ja_file):
            process_file_sync(en_file, ja_file)

if __name__ == "__main__":
    main()
