function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    let parser = new DOMParser();
    let baseDoc = parser.parseFromString(baseHTML, 'text/html');

    let baseContent = getContentArea(baseDoc);
    let currentContent = getContentArea(currentDoc);

    if (!baseContent || !currentContent) return;

    // Use your locally installed diff_match_patch library
    const dmp = new window.diff_match_patch();
    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

    // --- THE FIX: STRIP SPHINX NOISE ---
    // This removes changing IDs and alternating row colors so the diff engine 
    // doesn't hallucinate structural changes and break the tables.
    function sanitizeSphinxNoise(html) {
        return html
            .replace(/\s+id="id\d+"/gi, '') 
            .replace(/\s+class="[^"]*(?:row-odd|row-even)[^"]*"/gi, '');
    }

    let oldHtmlString = sanitizeSphinxNoise(baseContent.innerHTML);
    let newHtmlString = sanitizeSphinxNoise(currentContent.innerHTML);

    // --- YOUR EXACT ORIGINAL TOKENIZER ---
    function tokenize(html) {
        let tokens = [];
        let regex = /(<[^>]+>)|([^<>\s]+)|(\s+)/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            tokens.push(match[0]);
        }
        return tokens;
    }

    let oldTokens = tokenize(oldHtmlString);
    let newTokens = tokenize(newHtmlString);

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

    let finalHtml = '';
    const autoNumRegex = /^((?:Section\s+|Table\s+)?[\d\.]+\s+)/i;

    // --- YOUR EXACT ORIGINAL ASSEMBLY LOOP ---
    for (let i = 0; i < diffs.length; i++) {
        let op = diffs[i][0];
        let chars = diffs[i][1];

        for (let j = 0; j < chars.length; j++) {
            let token = charToToken.get(chars[j]);
            let isTag = token.startsWith('<') && token.endsWith('>');
            let isWhitespace = /^\s+$/.test(token);
            let isAutoNum = autoNumRegex.test(token);

            if (isTag) {
                if (op === 0 || op === 1) {
                    finalHtml += token;
                } else if (op === -1) {
                    let t = token.toLowerCase();
                    let safeTags = ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'div', 'dl', 'dt', 'dd'];
                    
                    let isSafe = safeTags.some(tag => 
                        t.startsWith('<' + tag + '>') || 
                        t.startsWith('<' + tag + ' ') || 
                        t.startsWith('</' + tag + '>')
                    );

                    if (isSafe) {
                        if (t.startsWith('<table') || t.startsWith('<ul') || t.startsWith('<ol') || t.startsWith('<dl')) {
                            finalHtml += token.replace(/^<([a-zA-Z0-9]+)/, '<$1 style="margin-bottom: 20px !important; opacity: 0.5"');
                        } else {
                            finalHtml += token;
                        }
                    }
                }
            } else {
                if (op === 0) {
                    finalHtml += token;
                } else if (op === 1) {
                    if (isWhitespace || isAutoNum) {
                        finalHtml += token;
                    } else {
                        finalHtml += `<ins style="background: #d4fcbc; color: #155724; text-decoration: none; border-radius: 2px; padding: 1px 2px;">${token}</ins>`;
                    }
                } else if (op === -1) {
                    if (!isWhitespace && !isAutoNum) {
                        finalHtml += `<del style="background: #ffdce0; color: #b31d28; text-decoration: line-through; border-radius: 2px; padding: 1px 2px;">${token}</del>`;
                    }
                }
            }
        }
    }

    currentContent.innerHTML = finalHtml;
    return 1;
}
