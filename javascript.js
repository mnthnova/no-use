async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    let parser = new DOMParser();
    let baseDoc = parser.parseFromString(baseHTML, 'text/html');
    let baseContent = getContentArea(baseDoc);
    let currentContent = getContentArea(currentDoc);

    if (!baseContent || !currentContent) return;

    // Secure the live HTML so the toggle off function works flawlessly
    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

    const dmp = new window.diff_match_patch();

    // 1. YOUR ORIGINAL EXACT TOKENIZER
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

    let tokenToChar = new Map();
    let charToToken = new Map();
    let nextCharCode = 0xE000;

    function tokenToString(tokens) {
        let str = '';
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            if (!tokenToChar.has(token)) {
                let char = String.fromCharCode(nextCharCode++);
                tokenToChar.set(token, char);
                charToToken.set(char, token);
            }
            str += tokenToChar.get(token);
        }
        return str;
    }

    let oldStr = tokenToString(oldTokens);
    let newStr = tokenToString(newTokens);

    let diffs = dmp.diff_main(oldStr, newStr);
    dmp.diff_cleanupSemantic(diffs);

    // Flatten the diff array for easier lookahead scanning
    let operations = [];
    for (let i = 0; i < diffs.length; i++) {
        let op = diffs[i][0];
        let chars = diffs[i][1];
        for (let j = 0; j < chars.length; j++) {
            operations.push({
                op: op,
                token: charToToken.get(chars[j])
            });
        }
    }

    let finalHtml = '';
    let structuralTags = ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'div', 'dl', 'dt', 'dd', 'caption', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const autoNumRegex = /^((?:Section\s+|Table\s+)?[\d\.]+\s+)/i;

    function getBaseTag(t) {
        let match = t.match(/^<\/?([a-zA-Z0-9]+)/);
        return match ? match[1].toLowerCase() : null;
    }

    // 2. ASSEMBLY LOOP WITH LOOKAHEAD PROTECTION
    for (let i = 0; i < operations.length; i++) {
        let op = operations[i].op;
        let token = operations[i].token;
        let isTag = token.startsWith('<') && token.endsWith('>');
        let isWhitespace = /^\s+$/.test(token);

        if (isTag) {
            let baseTag = getBaseTag(token);
            let isStructural = baseTag && structuralTags.includes(baseTag);

            if (op === 0) {
                finalHtml += token;
            } else if (op === 1) {
                finalHtml += token; // Safely allow inserted Sphinx updates
            } else if (op === -1) {
                if (isStructural) {
                    let isReplaced = false;
                    
                    // THE BREAKTHROUGH: Scan ahead up to 15 tokens to see if Sphinx just swapped the class/ID
                    for (let k = i + 1; k < Math.min(i + 15, operations.length); k++) {
                        let nextOp = operations[k].op;
                        let nextToken = operations[k].token;
                        if (nextOp === 1 && nextToken.startsWith('<') && getBaseTag(nextToken) === baseTag) {
                            isReplaced = true;
                            break;
                        }
                    }

                    // If Sphinx replaced it, DROP the deleted tag to stop duplication and grid breaking.
                    // If it is genuinely deleted, keep it but render it transparently to protect the structure.
                    if (!isReplaced) {
                        if (token.startsWith('<') && !token.startsWith('</')) {
                            finalHtml += token.replace(/>$/, ' style="opacity: 0.5;">');
                        } else {
                            finalHtml += token;
                        }
                    }
                } else {
                    finalHtml += token; // Keep deleted inline elements like <b> safe
                }
            }
        } else {
            // 3. TEXT NODE HIGHLIGHTING (No tags get wrapped)
            if (op === 0) {
                finalHtml += token;
            } else if (op === 1) {
                if (isWhitespace) {
                    finalHtml += token;
                } else {
                    finalHtml += `<ins style="background: #d4fcbc; color: #155724; text-decoration: none; border-radius: 2px; padding: 1px 2px;">${token}</ins>`;
                }
            } else if (op === -1) {
                if (!isWhitespace && !autoNumRegex.test(token)) {
                    finalHtml += `<del style="background: #ffdce0; color: #b31d28; text-decoration: line-through; border-radius: 2px; padding: 1px 2px;">${token}</del>`;
                }
            }
        }
    }

    currentContent.innerHTML = finalHtml;
    console.log("Visual Diff applied successfully.");
    return 1;
}
