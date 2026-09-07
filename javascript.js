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
    
    // FIX 1: Tell the engine never to time out on massive tables.
    // This stops it from defaulting to a full block delete/insert (which causes the duplicate headings).
    dmp.Diff_Timeout = 0; 

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
            
            // FIX 2: Create a normalized key for HTML tags.
            // This forces the Diff engine to see <tr class="row-odd"> and <tr class="row-even"> 
            // as the exact same character, preventing table rows from duplicating and breaking the DOM.
            let mapKey = token;
            if (token.startsWith('<') && token.endsWith('>')) {
                let match = token.match(/^<\s*(\/?)\s*([a-zA-Z0-9\-]+)/);
                if (match) {
                    mapKey = `<${match[1]}${match[2].toLowerCase()}>`;
                }
            }

            if (!tokenToChar.has(mapKey)) {
                let char = String.fromCharCode(nextCharCode++);
                tokenToChar.set(mapKey, char);
                charToToken.set(char, token);
            } else {
                // FIX 3: Always update to the newest token. 
                // This preserves Sphinx's updated classes/IDs without triggering a diff operation.
                charToToken.set(tokenToChar.get(mapKey), token);
            }
            str += tokenToChar.get(mapKey);
        }
        return str;
    }

    let oldStr = tokenToString(oldTokens);
    let newStr = tokenToString(newTokens);

    let diffs = dmp.diff_main(oldStr, newStr);

    // FIX 4: Disable semantic cleanup. 
    // This was actively shifting your diff boundaries across HTML tags and scrambling the table layout.
    // dmp.diff_cleanupSemantic(diffs);

    let finalHtml = '';

    for (let i = 0; i < diffs.length; i++) {
        let op = diffs[i][0];
        let chars = diffs[i][1];

        for (let j = 0; j < chars.length; j++) {
            let token = charToToken.get(chars[j]);
            let isTag = token.startsWith('<') && token.endsWith('>');
            let isWhitespace = /^\s+$/.test(token);

            if (isTag) {
                if (op === 0 || op === 1) {
                    finalHtml += token;
                } else if (op === -1) {
                    let t = token.toLowerCase();
                    // Added h1-h6 so deleted headings are treated as safe and don't collapse
                    let safeTags = ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'div', 'dl', 'dt', 'dd', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
                    
                    let isSafe = safeTags.some(tag => 
                        t.startsWith('<' + tag + '>') || 
                        t.startsWith('<' + tag + ' ') || 
                        t.startsWith('</' + tag + '>')
                    );

                    if (isSafe) {
                        if (t.match(/^<(table|p|ul|ol|dl)/)) {
                            finalHtml += token.replace(/^<([a-zA-Z0-9]+)/, '<$1 style="margin-bottom: 20px !important; opacity:0.75;" ');
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
