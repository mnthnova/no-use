function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    let parser = new DOMParser();
    let baseDoc = parser.parseFromString(baseHTML, 'text/html');

    let baseContent = getContentArea(baseDoc);
    let currentContent = getContentArea(currentDoc);

    if (!baseContent || !currentContent) return;

    const dmp = new window.diff_match_patch();
    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

    // 1. YOUR ORIGINAL, PERFECT TOKENIZER
    function tokenize(html) {
        let tokens = [];
        let regex = /(<[^>]+>)|([^<>\s]+)|(\s+)/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            tokens.push(match[0]);
        }
        return tokens;
    }

    // Tokenize the ENTIRE document at once to guarantee perfect word-by-word alignment
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

    // Flatten diffs into a straightforward array of [operation, token] for easier handling
    let tokenDiffs = [];
    for (let i = 0; i < diffs.length; i++) {
        let op = diffs[i][0];
        let chars = diffs[i][1];
        for (let j = 0; j < chars.length; j++) {
            tokenDiffs.push([op, charToToken.get(chars[j])]);
        }
    }

    let finalHtml = '';
    let autoNumRegex = /^((?:Section\s+|Table\s+)?[\d\.]+\s+)/i;
    let safeTagsRegex = /<\/?(table|thead|tbody|tr|th|td|ul|ol|li|div|dl|dt|dd|p|h[1-6])[ >]/i;

    // 2. YOUR ORIGINAL ASSEMBLY LOOP (With the Table Break Fix)
    for (let i = 0; i < tokenDiffs.length; i++) {
        let op = tokenDiffs[i][0];
        let token = tokenDiffs[i][1];
        let isTag = token.startsWith('<') && token.endsWith('>');
        let isWhitespace = /^\s+$/.test(token);
        let isAutoNum = autoNumRegex.test(token);

        if (isTag) {
            if (op === 0 || op === 1) {
                finalHtml += token;
            } else if (op === -1) {
                // THE FIX: If a structural tag is deleted, check if Sphinx is just swapping an attribute.
                if (safeTagsRegex.test(token)) {
                    let baseTagMatch = token.match(/^<\/?([a-zA-Z0-9]+)/);
                    let baseTag = baseTagMatch ? baseTagMatch[1].toLowerCase() : '';
                    
                    let hasReplacement = false;
                    // Look ahead a few tokens to see if the same tag type is inserted right after
                    for (let k = i + 1; k < Math.min(i + 15, tokenDiffs.length); k++) {
                        let nextOp = tokenDiffs[k][0];
                        let nextToken = tokenDiffs[k][1];
                        if (nextOp === 1 && nextToken.startsWith('<') && nextToken.endsWith('>')) {
                            let nextBaseTagMatch = nextToken.match(/^<\/?([a-zA-Z0-9]+)/);
                            let nextBaseTag = nextBaseTagMatch ? nextBaseTagMatch[1].toLowerCase() : '';
                            if (nextBaseTag === baseTag) {
                                hasReplacement = true;
                                break;
                            }
                        }
                    }
                    
                    // If a replacement is coming, drop this deleted tag to prevent duplicate tags from breaking the table.
                    // If no replacement is coming (a true deletion), keep it so the structure stays balanced.
                    if (!hasReplacement) {
                        finalHtml += token;
                    }
                }
            }
        } else {
            // TEXT HIGHLIGHTING
            if (op === 0) {
                finalHtml += token;
            } else if (op === 1) {
                if (isWhitespace || isAutoNum) finalHtml += token;
                else finalHtml += `<ins style="background: #d4fcbc; color: #155724; text-decoration: none; border-radius: 2px; padding: 1px 2px;">${token}</ins>`;
            } else if (op === -1) {
                if (!isWhitespace && !isAutoNum) {
                    finalHtml += `<del style="background: #ffdce0; color: #b31d28; text-decoration: line-through; border-radius: 2px; padding: 1px 2px;">${token}</del>`;
                }
            }
        }
    }

    currentContent.innerHTML = finalHtml;
    return 1;
}
