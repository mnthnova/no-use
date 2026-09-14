import os
import re
import requests
import urllib3
from docutils.core import publish_doctree
from docutils import nodes

# ... (Keep your DummyDirective registrations here to protect tables) ...
   def contains_japanese(text):
    """Detects Kanji, Hiragana, Katakana, JP Punctuation, and Half/Full-width forms."""
    return bool(re.search(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FBF\u3000-\u303F\uFF00-\uFFEF]', text))

def contains_japanese(text):
    """Detects if a string contains Japanese characters."""
    # Regex looks for Hiragana, Katakana, and Kanji Unicode blocks
    return bool(re.search(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FBF]', text))

def replace_nth_occurrence(full_text, old_str, new_str, n):
    """Safely replaces the Nth occurrence of a string in the raw file."""
    val = -1
    for _ in range(0, n):
        val = full_text.find(old_str, val + 1)
        if val == -1: return full_text # Failsafe if not found
    return full_text[:val] + new_str + full_text[val+len(old_str):]

def process_mixed_file(source_file):
    print(f"\n[PROCESS] Splitting and translating: {source_file}")
    
    # Define output paths
    ja_file = source_file.replace('content/', 'content_ja/', 1)
    en_file = source_file.replace('content/', 'content_en/', 1)
    
    os.makedirs(os.path.dirname(ja_file), exist_ok=True)
    os.makedirs(os.path.dirname(en_file), exist_ok=True)

    # 1. Extract AST Nodes from the Mixed File
    with open(source_file, 'r', encoding='utf-8') as f:
        raw_mixed_text = f.read()
    
    tree = publish_doctree(raw_mixed_text)
    mixed_nodes = [node.astext() for node in tree.findall(nodes.Text)]
    
    raw_ja_text = raw_mixed_text
    raw_en_text = raw_mixed_text
    
    occurrences_ja = {}
    occurrences_en = {}

    # 2. Iterate through every text block in the file
    for text in mixed_nodes:
        clean_text = text.strip()
        if not clean_text or clean_text.startswith(('.. ', '|')):
            continue

        is_jp = contains_japanese(text)
        
        # Track how many times this exact string has appeared so far
        occurrences_ja[text] = occurrences_ja.get(text, 0) + 1
        occurrences_en[text] = occurrences_en.get(text, 0) + 1
        
        if is_jp:
            # It is Japanese. Translate it to English for the EN file.
            translated_en = get_translation(text, to_lang="english") # Update your API function to accept to_lang
            if translated_en != text:
                raw_en_text = replace_nth_occurrence(raw_en_text, text, translated_en, occurrences_en[text])
        else:
            # It is English. Translate it to Japanese for the JA file.
            translated_ja = get_translation(text, to_lang="japanese")
            if translated_ja != text:
                raw_ja_text = replace_nth_occurrence(raw_ja_text, text, translated_ja, occurrences_ja[text])

    # 3. Save the separated files
    with open(ja_file, 'w', encoding='utf-8') as f:
        f.write(raw_ja_text)
    print(f"[SUCCESS] Generated 100% Japanese file: {ja_file}")
        
    with open(en_file, 'w', encoding='utf-8') as f:
        f.write(raw_en_text)
    print(f"[SUCCESS] Generated 100% English file: {en_file}")
