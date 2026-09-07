// Apply Visual Diff By Comparing Text Nodes
function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    let parser = new DOMParser();
    let baseDoc = parser.parseFromString(baseHTML, 'text/html');

    let baseContent = getContentArea(baseDoc);
    let currentContent = getContentArea(currentDoc);

    if (!baseContent || !currentContent) {
        console.log('Could Not Find Content Area');
        return;
    }

    const dmp = new window.diff_match_patch();

    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

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

    // 🛑 CRITICAL FIX 1: Do NOT run diff_cleanupSemantic. 
    // Commenting this out prevents the table breaking and the duplicate header issue.
    // dmp.diff_cleanupSemantic(diffs);

    let finalHtml = '';

    for (let i = 0; i < diffs.length; i++) {
        let op = diffs[i][0];
        let chars = diffs[i][1];

        for (let j = 0; j < chars.length; j++) {
            let token = charToToken.get(chars[j]);
            
            // Safer check for HTML tags
            let isTag = /^<.*>$/.test(token);
            let isWhitespace = /^\s+$/.test(token);

            if (isTag) {
                let t = token.toLowerCase();
                let safeTags = ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'div', 'dl', 'dt', 'dd', 'p'];
                
                // 🛑 CRITICAL FIX 2: Use regex for `isSafe` to catch tags with attributes/newlines
                let isSafe = safeTags.some(tag => {
                    let regex = new RegExp(`^</?${tag}([\\s>]|$)`, 'i');
                    return regex.test(t);
                });

                if (op === 0 || op === 1) {
                    finalHtml += token;
                } else if (op === -1) {
                    if (isSafe) {
                        // 🛑 CRITICAL FIX 3: Robust matching for applying styles to deleted blocks
                        if (/^<(table|p|ul|ol|dl)([\s>]|$)/i.test(t)) {
                            finalHtml += token.replace(/^<([a-z0-9]+)/i, '<$1 style="margin-bottom: 20px !important; opacity:0.75;" ');
                        } else {
                            finalHtml += token;
                        }
                    }
                }
            } else {
                if (op === 0) {
                    finalHtml += token;
                } else if (op === 1) {
                    if (isWhitespace) {
                        finalHtml += token;
                    } else {
                        finalHtml += `<ins style="background: #d4fcbc; color: #155724; text-decoration: none; border-radius: 2px; padding: 1px 2px;">${token}</ins>`;
                    }
                } else if (op === -1) {
                    if (isWhitespace) {
                        finalHtml += token;
                    } else {
                        finalHtml += `<del style="background: #ffdcbb; color: #b31d28; text-decoration: line-through; border-radius: 2px; padding: 1px 2px;">${token}</del>`;
                    }
                }
            }
        }
    }

    currentContent.innerHTML = finalHtml;
    return 1;
}
