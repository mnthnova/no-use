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
    
    // CRITICAL: Stop DMP from giving up on complex tables and doing a full wipe
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

    // NORMALIZER: Strips attributes temporarily ONLY for the matching engine.
    // This forces DMP to see `<tr class="odd">` and `<tr class="even">` as identical structural matches.
    function getBaseTag(token) {
        let match = token.match(/^<\s*(\/?)\s*([a-zA-Z0-9\-]+)/);
        if (match) {
            return `<${match[1]}${match[2].toLowerCase()}>`;
        }
        return token;
    }

    let tokenToChar = new Map();
    let nextCharCode = 0x1000;

    let oldStr = '';
    for (let i = 0; i < oldTokens.length; i++) {
        let norm = getBaseTag(oldTokens[i]);
        if (!tokenToChar.has(norm)) {
            tokenToChar.set(norm, String.fromCharCode(nextCharCode++));
        }
        oldStr += tokenToChar.get(norm);
    }

    let newStr = '';
    for (let i = 0; i < newTokens.length; i++) {
        let norm = getBaseTag(newTokens[i]);
        if (!tokenToChar.has(norm)) {
            tokenToChar.set(norm, String.fromCharCode(nextCharCode++));
        }
        newStr += tokenToChar.get(norm);
    }

    let diffs = dmp.diff_main(oldStr, newStr);

    let finalHtml = '';
    
    // DUAL POINTERS: We track the exact index in your original token arrays.
    let oldIdx = 0;
    let newIdx = 0;

    for (let i = 0; i < diffs.length; i++) {
        let op = diffs[i][0];
        let chars = diffs[i][1];

        // chars.length perfectly dictates how many tokens to advance in the arrays
        for (let j = 0; j < chars.length; j++) {
            
            if (op === 0) {
                // UNCHANGED: Output the new token to preserve Sphinx's updated attributes/IDs.
                // This eliminates the duplicate heading issue completely.
                finalHtml += newTokens[newIdx];
                oldIdx++;
                newIdx++;
                
            } else if (op === 1) {
                // INSERTED
                let token = newTokens[newIdx];
                let isTag = /^<.*>$/.test(token);
                let isWhitespace = /^\s+$/.test(token);
                
                if (isTag || isWhitespace) {
                    finalHtml += token; // Structural tags pass through cleanly
                } else {
                    finalHtml += `<ins style="background: #d4fcbc; color: #155724; text-decoration: none; border-radius: 2px; padding: 1px 2px;">${token}</ins>`;
                }
                newIdx++;
                
            } else if (op === -1) {
                // DELETED
                let token = oldTokens[oldIdx];
                let isTag = /^<.*>$/.test(token);
                let isWhitespace = /^\s+$/.test(token);

                if (isTag) {
                    let tLow = token.toLowerCase();
                    // If an entire table/list is deleted, render it with a red background
                    if (/^<(table|ul|ol|dl)([\s>]|$)/i.test(tLow)) {
                        finalHtml += token.replace(/^<([a-z0-9\-]+)/i, '<$1 style="background: #ffe6e6 !important; opacity:0.75;" ');
                    } else {
                        finalHtml += token; // Preserve deleted structural tags so the layout doesn't collapse
                    }
                } else if (isWhitespace) {
                    finalHtml += token;
                } else {
                    finalHtml += `<del style="background: #ffdcbb; color: #b31d28; text-decoration: line-through; border-radius: 2px; padding: 1px 2px;">${token}</del>`;
                }
                oldIdx++;
            }
        }
    }

    currentContent.innerHTML = finalHtml;
    return 1;
}
