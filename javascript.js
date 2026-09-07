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
    
    // Stop the engine from giving up on complex tables and doing a full wipe
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

    // NORMALIZER: Strips classes/IDs temporarily ONLY for the math engine.
    // This forces it to see <tr class="odd"> and <tr class="even"> as the exact same structure.
    function getMatchString(token) {
        if (/^<.*>$/.test(token)) {
            let match = token.match(/^<\s*(\/?)\s*([a-zA-Z0-9\-]+)/);
            if (match) {
                return `<${match[1]}${match[2].toLowerCase()}>`; // Returns pure <tr>, <h3>, etc.
            }
        }
        return token; // Text and whitespace remain perfectly intact
    }

    let tokenToChar = new Map();
    let nextCharCode = 0xE000;

    let oldStr = '';
    for (let i = 0; i < oldTokens.length; i++) {
        let norm = getMatchString(oldTokens[i]);
        if (!tokenToChar.has(norm)) {
            tokenToChar.set(norm, String.fromCharCode(nextCharCode++));
        }
        oldStr += tokenToChar.get(norm);
    }

    let newStr = '';
    for (let i = 0; i < newTokens.length; i++) {
        let norm = getMatchString(newTokens[i]);
        if (!tokenToChar.has(norm)) {
            tokenToChar.set(norm, String.fromCharCode(nextCharCode++));
        }
        newStr += tokenToChar.get(norm);
    }

    let diffs = dmp.diff_main(oldStr, newStr);

    let finalHtml = '';
    let oldIdx = 0;
    let newIdx = 0;

    for (let i = 0; i < diffs.length; i++) {
        let op = diffs[i][0];
        let chars = diffs[i][1];

        for (let j = 0; j < chars.length; j++) {
            
            if (op === 0) {
                // EQUAL: Output the NEW token to inherit updated Sphinx classes/IDs quietly.
                finalHtml += newTokens[newIdx];
                oldIdx++;
                newIdx++;
                
            } else if (op === 1) {
                // INSERT
                let token = newTokens[newIdx];
                let isTag = /^<.*>$/.test(token);
                let isWhitespace = /^\s+$/.test(token);
                
                if (isTag || isWhitespace) {
                    // CRITICAL: Never wrap HTML tags in formatting. Pass them through untouched.
                    finalHtml += token; 
                } else {
                    finalHtml += `<ins style="background: #d4fcbc; color: #155724; text-decoration: none; border-radius: 2px; padding: 1px 2px;">${token}</ins>`;
                }
                newIdx++;
                
            } else if (op === -1) {
                // DELETE
                let token = oldTokens[oldIdx];
                let isTag = /^<.*>$/.test(token);
                let isWhitespace = /^\s+$/.test(token);

                if (isTag || isWhitespace) {
                    // CRITICAL: If a row is deleted, we MUST keep the <tr> and <td> tags intact 
                    // so the table structure doesn't collapse. We only highlight the text inside it.
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
