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



















def upload_file_to_svn_path(ticket, file_path, SVN_USERNAME, SVN_PASSWORD, BASE_PATH, SVN_URL_PATH, SVN_REPO_NAME, attachments_info):
    """
    attachments_info should be a list of dicts: [{"filename": "Manthan.txt", "id": "12345"}, ...]
    """
    try:
        # Pass the full list of dicts directly to the commit function
        svn_dest_url = copy_files_and_commit(
            ticket, SVN_REPO_NAME, file_path, SVN_USERNAME, SVN_PASSWORD, BASE_PATH, SVN_URL_PATH, attachments_info
        )
        return svn_dest_url
    except Exception as e:
        logger.error(f"Exception during SVN upload for ticket {ticket}: {e}")
        return None

def copy_files_and_commit(ticket, SVN_REPO_NAME, file_path, SVN_USERNAME, SVN_PASSWORD, BASE_PATH, SVN_URL_PATH, attachments_info):
    ticket_folder = str(ticket)
    svn_ticket_url = f"{SVN_URL_PATH}/{ticket_folder}"
    
    try:
        # 1. Check if the main ticket folder exists on the SVN server. If not, create it.
        if run_command(["svn", "ls", svn_ticket_url, "--trust-server-cert", "--non-interactive"]).returncode != 0:
            logger.info(f"Folder not found. Creating remote ticket folder: {svn_ticket_url}")
            run_command(["svn", "mkdir", svn_ticket_url, "-m", f"Create ticket folder {ticket_folder}", "--trust-server-cert", "--non-interactive"])
        
        # 2. Process each attachment into its own isolated ID folder
        for att in attachments_info:
            filename = att["filename"]
            att_id = att.get("id", "unknown")
            
            svn_att_url = f"{svn_ticket_url}/{att_id}"
            local_att_path = os.path.join(file_path, SVN_REPO_NAME, ticket_folder, att_id)
            
            # Create the unique ID folder remotely if it doesn't exist
            if run_command(["svn", "ls", svn_att_url, "--trust-server-cert", "--non-interactive"]).returncode != 0:
                run_command(["svn", "mkdir", svn_att_url, "-m", f"Create attachment folder {att_id}", "--trust-server-cert", "--non-interactive"])
            
            # CHECKOUT ONLY THIS EMPTY ID FOLDER (Super fast, ignores all old attachments!)
            logger.info(f"Checking out empty ID folder to {local_att_path}")
            run_command(["svn", "checkout", svn_att_url, local_att_path, "--trust-server-cert", "--non-interactive"])
            
            # Copy the file from your temp path into the new working copy
            source_file = os.path.join(file_path, filename)
            dest_file = os.path.join(local_att_path, filename)
            
            logger.info(f"Copying {source_file} to {dest_file}")
            shutil.copy(source_file, dest_file)
            
            # Add and commit the specific file
            run_command(["svn", "add", filename, "--force"], cwd=local_att_path)
            run_command(["svn", "commit", "-m", f"Commit for ticket {ticket_folder} file {filename}", "--trust-server-cert", "--non-interactive"], cwd=local_att_path)
            
        return svn_ticket_url
        
    except Exception as e:
        logger.error(f"Exception during SVN operation for ticket {ticket}: {e}")
        return None

if __name__ == "__main__":
    main()
