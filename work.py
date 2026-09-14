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
                    
                    # For English Output: Translate if the source is Japanese
                    if target_lang == "en" and is_jp:
                        entry.msgstr = get_translation(entry.msgid, to_lang="en")
                        updated = True
                    # For Japanese Output: Translate if the source is English
                    elif target_lang == "ja" and not is_jp:
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
