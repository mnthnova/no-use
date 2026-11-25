import os
import re
import requests
import urllib3
import polib

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
INTERNAL_API_URL = ""

def contains_japanese(text):
    """Detects Kanji, Hiragana, Katakana, JP Punctuation, and Half/Full-width forms."""
    return bool(re.search(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FBF\u3000-\u303F\uFF00-\uFFEF]', text))

def get_translation(text, to_lang):
    clean_text = text.strip()
    if not clean_text:
        return text
    print(f"  [API] Translating to {to_lang}: {clean_text[:30]}...")
    payload = {"texts": [text], "from_lang": "auto", "to_lang": "japanese" if to_lang == "ja" else "english"}
    try:
        response = requests.post(INTERNAL_API_URL, json=payload, timeout=20, verify=False, proxies={"http": None, "https": None})
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok" and data.get("texts"):
                return data["texts"][0]
    except Exception as e:
        print(f"  [API ERROR] {e}")
    return text

def translate_plantuml_block(uml_text, target_lang):
    """Parses PlantUML code, translates ONLY human text, and protects diagram syntax."""
    translated_lines = []
    
    for line in uml_text.splitlines():
        # 1. Skip structural keywords that should never be translated
        if line.strip().startswith(('skinparam', 'activate', 'deactivate', 'destroy', '@startuml', '@enduml', '.. uml::', 'autonumber')):
            translated_lines.append(line)
            continue

        # 2. Extract and translate text after a colon (e.g., A -> B: "Do Work")
        colon_match = re.match(r'^([^:]+:[ \t]*)(.+)$', line)
        
        # 3. Extract and translate text inside quotes (e.g., participant "First Class" as A)
        quote_match = re.search(r'"([^"]+)"', line)

        if colon_match and ('->' in line or 'note' in line.lower()):
            syntax_part = colon_match.group(1) # E.g., 'A -> B: '
            human_text = colon_match.group(2).strip().strip('"') # E.g., 'Do Work'
            
            translated_text = get_translation(human_text, to_lang=target_lang)
            translated_lines.append(f'{syntax_part}{translated_text}')
            
        elif quote_match and line.strip().startswith(('participant', 'actor', 'component', 'node', 'database', 'rectangle')):
            human_text = quote_match.group(1)
            translated_text = get_translation(human_text, to_lang=target_lang)
            
            # Replace ONLY the text inside the quotes, preserving the alias (as A)
            new_line = line.replace(f'"{human_text}"', f'"{translated_text}"')
            translated_lines.append(new_line)
            
        else:
            # If it doesn't match a translatable pattern, leave the code intact
            translated_lines.append(line)

    return '\n'.join(translated_lines)

def process_po_directory(locale_dir, target_lang):
    if not os.path.exists(locale_dir):
        print(f"[WARNING] Locale directory not found: {locale_dir}")
        return

    for root, dirs, files in os.walk(locale_dir):
        for file in files:
            if file.endswith(".po"):
                filepath = os.path.join(root, file)
                print(f"Processing PO file: {filepath}")
                po = polib.pofile(filepath)
                
                updated = False
                for entry in po:
                    is_jp = contains_japanese(entry.msgid)
                    is_uml = ".. uml::" in entry.msgid or "@startuml" in entry.msgid
                    
                    # For English Output: Translate if the source is Japanese
                    if target_lang == "en" and is_jp:
                        if is_uml:
                            entry.msgstr = translate_plantuml_block(entry.msgid, "en")
                        else:
                            entry.msgstr = get_translation(entry.msgid, to_lang="en")
                        updated = True
                        
                    # For Japanese Output: Translate if the source is English
                    elif target_lang == "ja" and not is_jp:
                        if is_uml:
                            entry.msgstr = translate_plantuml_block(entry.msgid, "ja")
                        else:
                            entry.msgstr = get_translation(entry.msgid, to_lang="ja")
                        updated = True
                
                if updated:
                    po.save(filepath)
                    print(f"  -> Saved updates to {file}")

def main():
    print("--- Starting PO File Translation ---")
    
    # Process English PO files
    en_locale_dir = 'docs/source/locale/en/LC_MESSAGES'
    print("\n--- Translating Japanese blocks to English ---")
    process_po_directory(en_locale_dir, target_lang="en")
    
    # Process Japanese PO files
    ja_locale_dir = 'docs/source/locale/ja/LC_MESSAGES'
    print("\n--- Translating English blocks to Japanese ---")
    process_po_directory(ja_locale_dir, target_lang="ja")

if __name__ == "__main__":
    main()















def translate_plantuml_in_memory(app, docname, source):
    # Only trigger translation if this is the Japanese build
    if not any("language=ja" in arg for arg in sys.argv):
        return

    raw_rst_text = source[0]

    def translate_uml_block(match):
        uml_block = match.group(0)

        def call_api(eng_text):
            # Skip empty lines, variables, or URLs
            if not eng_text.strip() or eng_text.startswith(('http', '|')): 
                return eng_text
            try:
                payload = {"texts": [eng_text], "from_lang": "english", "to_lang": "japanese"}
                # Replace with your actual internal API URL
                res = requests.post("YOUR_INTERNAL_API_URL_HERE", json=payload, timeout=10, verify=False)
                return res.json()["texts"][0]
            except Exception:
                return eng_text # Fallback to English on API failure

        # 1. Translate Participant Names (Inside Quotes)
        def translate_quotes(q_match):
            return f'"{call_api(q_match.group(1))}"'
        
        uml_block = re.sub(r'"([^"]+)"', translate_quotes, uml_block)

        # 2. Translate Arrow Messages (After Colons)
        def translate_colon_text(c_match):
            syntax_part = c_match.group(1)
            eng_text = c_match.group(2)
            # Skip if already translated by the quote regex in step 1
            if eng_text.strip().startswith('"'): 
                return c_match.group(0)
            ja_text = call_api(eng_text)
            return f'{syntax_part}{ja_text}'

        uml_block = re.sub(r'^([ \t]*[^:\n]+:[ \t]*)(.+)$', translate_colon_text, uml_block, flags=re.MULTILINE)
        return uml_block

    # Regex isolates ONLY .. uml:: blocks (matches the directive and all indented lines below it)
    pattern = r'^\.\. uml::\n(?:^[ \t]+.*\n?)*'
    source[0] = re.sub(pattern, translate_uml_block, raw_rst_text, flags=re.MULTILINE)
