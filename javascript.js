async function applyDiff(baseHTML, currentDoc) {
    clearHighlights(); // Ensures any previous state is wiped

    let parser = new DOMParser();
    let baseDoc = parser.parseFromString(baseHTML, 'text/html');
    let baseContent = getContentArea(baseDoc);
    let currentContent = getContentArea(currentDoc);

    if (!baseContent || !currentContent) return;

    // Securely save the pristine live HTML so toggleDiff() can turn it off perfectly
    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

    const dmp = new window.diff_match_patch();

    // 1. EXACT ORIGINAL TOKENIZER
    function tokenize(html) {
        let tokens = [];
        let regex = /(<[^>]+>)|([^<>\s]+)|(\s+)/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            tokens.push(match[0]);
        }
        return tokens;
    }

    let oldTokens = tokenize(baseContent.innerHTML);
    let newTokens = tokenize(currentContent.innerHTML);

    // 2. NORMALIZED COMPARISON KEYS
    // We temporarily strip Sphinx classes and IDs so the engine doesn't hallucinate structural changes.
    // This stops tables from breaking and headings from duplicating.
    function getCompareKey(token) {
        if (token.startsWith('<') && token.endsWith('>')) {
            let match = token.match(/^<\/?([a-zA-Z0-9]+)/);
            if (match) {
                let tag = match[1].toLowerCase();
                let structural = ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'div', 'dl', 'dt', 'dd', 'caption'];
                if (structural.includes(tag)) {
                    return match[0].toLowerCase() + '>'; // e.g., turns <tr class="row-odd"> into <tr>
                }
            }
        } else {
            // Normalizes Sphinx auto-numbers (e.g., "Table 1") so they don't trigger false diffs
            let autoNumRegex = /^((?:Section\s+|Table\s+)?[\d\.]+\s+)/i;
            if (autoNumRegex.test(token)) {
                return token.replace(autoNumRegex, 'AUTONUM_');
            }
        }
        return token;
    }

    // 3. STRICT 1:1 CHARACTER MAPPING
    let keyToChar = new Map();
    let nextCharCode = 0xE000;

    function tokensToChars(tokens) {
        let chars = "";
        for (let i = 0; i < tokens.length; i++) {
            let key = getCompareKey(tokens[i]);
            if (!keyToChar.has(key)) {
                keyToChar.set(key, String.fromCharCode(nextCharCode++));
            }
            chars += keyToChar.get(key);
        }
        return chars;
    }

    let oldStr = tokensToChars(oldTokens);
    let newStr = tokensToChars(newTokens);

    let diffs = dmp.diff_main(oldStr, newStr);
    dmp.diff_cleanupSemantic(diffs);

    // 4. BULLETPROOF ASSEMBLY LOOP
    // We walk through the exact changes, pulling from the pristine arrays so the DOM stays flawless.
    let finalHtml = '';
    let oldIdx = 0;
    let newIdx = 0;
    const autoNumRegex = /^((?:Section\s+|Table\s+)?[\d\.]+\s+)/i;

    for (let i = 0; i < diffs.length; i++) {
        let op = diffs[i][0];
        let chars = diffs[i][1];

        for (let j = 0; j < chars.length; j++) {
            if (op === 0) {
                // Unchanged: Pull the NEW token so Sphinx classes update silently behind the scenes
                finalHtml += newTokens[newIdx];
                oldIdx++;
                newIdx++;
            } else if (op === 1) {
                // Inserted
                let token = newTokens[newIdx];
                let isTag = token.startsWith('<') && token.endsWith('>');
                let isWhitespace = /^\s+$/.test(token);
                let isAutoNum = autoNumRegex.test(token);

                if (isTag || isWhitespace || isAutoNum) {
                    finalHtml += token; // Render tags, spaces, and autonumbers without green highlight
                } else {
                    finalHtml += `<ins style="background: #d4fcbc; color: #155724; text-decoration: none; border-radius: 2px; padding: 1px 2px;">${token}</ins>`;
                }
                newIdx++;
            } else if (op === -1) {
                // Deleted
                let token = oldTokens[oldIdx];
                let isTag = token.startsWith('<') && token.endsWith('>');
                let isWhitespace = /^\s+$/.test(token);

                if (isTag) {
                    let match = token.match(/^<\/?([a-zA-Z0-9]+)/);
                    let baseTag = match ? match[1].toLowerCase() : '';
                    let safeTags = ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'div', 'dl', 'dt', 'dd', 'caption'];
                    
                    if (safeTags.includes(baseTag)) {
                        // Keep deleted structural tags safely intact so the table grid never collapses
                        if (baseTag === 'table' || baseTag === 'ul' || baseTag === 'ol' || baseTag === 'dl') {
                            finalHtml += token.replace(/^<([a-zA-Z0-9]+)/, '<$1 style="margin-bottom: 20px !important; opacity: 0.5"');
                        } else {
                            finalHtml += token; 
                        }
                    } else {
                        finalHtml += token; // Keep deleted inline tags (like <b>) wrapped safely
                    }
                } else if (isWhitespace) {
                    // Ignore deleted whitespace to keep layout clean
                } else {
                    finalHtml += `<del style="background: #ffdce0; color: #b31d28; text-decoration: line-through; border-radius: 2px; padding: 1px 2px;">${token}</del>`;
                }
                oldIdx++;
            }
        }
    }

    currentContent.innerHTML = finalHtml;
    console.log("Visual Diff applied successfully.");
    return 1;
}
