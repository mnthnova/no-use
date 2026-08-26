import subprocess
import os
import requests

# Disable the unverified HTTPS warnings since you are using verify=False
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

INTERNAL_API_URL = ""

def get_translation(text, from_lang="english", to_lang="japanese"):
    """Your internal translation API, adapted for bidirectional sync."""
    clean_text = text.strip()
    if not clean_text:
        return text
        
    # Preserving your exact pipe bypass logic
    if clean_text.startswith('|') and clean_text.endswith('|'):
        return text

    payload = {
        "texts": [text],
        "from_lang": from_lang,
        "to_lang": to_lang
    }

    try:
        response = requests.post(
            INTERNAL_API_URL, 
            json=payload, 
            timeout=20, 
            verify=False, 
            proxies={"http": None, "https": None}
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok" and data.get("texts"):
                return data["texts"][0]
    except Exception as e:
        print(f"API ERROR FOR TEXT {text[:20]}... :- {e}")

    # Fallback to original text if API fails
    return text

def get_diff_output():
    """Runs git diff with 3 lines of context (-U3) to anchor the translation."""
    try:
        return subprocess.check_output(['git', 'diff', '-U3', 'HEAD~1', 'HEAD'], text=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running git diff: {e}")
        return ""

def process_hunk(file_path, target_path, from_lang, to_lang, context_lines, added_lines):
    """Translates the block and injects it into the correct location in the target file."""
    if not context_lines or not added_lines:
        return

    # 1. Translate the new text
    new_translated_text = get_translation('\n'.join(added_lines), from_lang, to_lang)
    
    # 2. Translate the context lines to build our sliding anchor map
    translated_context = [get_translation(line, from_lang, to_lang) for line in context_lines]

    # Read the target file
    if not os.path.exists(target_path):
        print(f"Target file {target_path} does not exist yet. Skipping injection.")
        return

    with open(target_path, 'r', encoding='utf-8') as f:
        target_file_lines = f.read().splitlines()

    # 3. Slide the map down to find the exact unique context block match
    insertion_index = -1
    for i in range(len(target_file_lines) - len(translated_context)):
        if target_file_lines[i:i+len(translated_context)] == translated_context:
            insertion_index = i + len(translated_context)
            break

    # 4. Inject and save
    if insertion_index != -1:
        target_file_lines.insert(insertion_index, new_translated_text)
        
        with open(target_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(target_file_lines) + '\n')
        print(f"Successfully synced new {to_lang} text to {target_path}")
    else:
        print(f"WARNING: Could not find matching context anchor in {target_path}. Manual sync required.")

def main():
    diff_text = get_diff_output()
    if not diff_text:
        return

    current_file = ""
    context_lines = []
    added_lines = []

    for line in diff_text.splitlines():
        if line.startswith('+++ b/'):
            current_file = line.replace('+++ b/', '')
            context_lines = []
            added_lines = []
        elif line.startswith(' ') and current_file:
            context_lines.append(line[1:]) 
        elif line.startswith('+') and not line.startswith('+++'):
            added_lines.append(line[1:])
            
        if added_lines and line.startswith((' ', '-', '@@')) and current_file:
            # SCENARIO A: English master was updated
            if current_file.startswith('content/') and current_file.endswith('.rst'):
                target = current_file.replace('content/', 'content_ja/', 1)
                os.makedirs(os.path.dirname(target), exist_ok=True)
                process_hunk(current_file, target, 'english', 'japanese', context_lines[-3:], added_lines)
            
            # SCENARIO B: Japanese master was updated
            elif current_file.startswith('content_ja/') and current_file.endswith('.rst'):
                target = current_file.replace('content_ja/', 'content/', 1)
                os.makedirs(os.path.dirname(target), exist_ok=True)
                process_hunk(current_file, target, 'japanese', 'english', context_lines[-3:], added_lines)
            
            added_lines = [] 

if __name__ == "__main__":
    main()
