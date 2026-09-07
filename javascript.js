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
    
    // CRITICAL: Prevent large tables from timing out and defaulting to a full block wipe
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

    // This strips attributes just for matching, so Sphinx class changes (row-even/odd) 
    // or Heading ID changes don't break the diff matching engine.
    function getNormalizedTag(token) {
        let match = token.match(/^<(\/?)([a-z0-9\-]+)/i);
        if (match) {
            return `<${match[1]}${match[2].toLowerCase()}>`; // e.g., <tr class="foo"> becomes <tr>
        }
        return token;
    }

    let oldTokens = tokenize(baseContent.innerHTML);
    let newTokens = tokenize(currentContent.innerHTML);

    let tokenToChar = new Map();
    let nextCharCode = 0x1000; // Start lower to allow for massive documents

    let oldStr = '';
    for (let i = 0; i < oldTokens.length; i++) {
        let norm = getNormalizedTag(oldTokens[i]);
        if (!tokenToChar.has(norm)) {
            tokenToChar.set(norm, String.fromCharCode(nextCharCode++));
        }
        oldStr += tokenToChar.get(norm);
    }

    let newStr = '';
    for (let i = 0; i < newTokens.length; i++) {
        let norm = getNormalizedTag(newTokens[i]);
        if (!tokenToChar.has(norm)) {
            tokenToChar.set(norm, String.fromCharCode(nextCharCode++));
        }
        newStr += tokenToChar.get(norm);
    }

    let diffs = dmp.diff_main(oldStr, newStr);

    // DO NOT enable this. It will shift diff boundaries across HTML tags and break tables.
    // dmp.diff_cleanupSemantic(diffs);

    let finalHtml = '';
    let oldIdx = 0;
    let newIdx = 0;

    // Dual-array pointer reconstruction. 
    // This mathematically guarantees we never duplicate tags or lose structure.
    for (let i = 0; i < diffs.length; i++) {
        let op = diffs[i][0];
        let chars = diffs[i][1];

        for (let j = 0; j < chars.length; j++) {
            
            if (op === 0) {
                // UNCHANGED: Output the new token (keeps updated Sphinx classes/IDs)
                finalHtml += newTokens[newIdx];
                oldIdx++;
                newIdx++;
                
            } else if (op === 1) {
                // INSERTED
                let token = newTokens[newIdx];
                let isTag = /^<.*>$/.test(token);
                let isWhitespace = /^\s+$/.test(token);

                if (isTag || isWhitespace) {
                    finalHtml += token; // Never wrap HTML tags in <ins>
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
                    let safeTags = ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col', 'caption', 'ul', 'ol', 'li', 'div', 'dl', 'dt', 'dd', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
                    let isSafe = safeTags.some(tag => new RegExp(`^</?${tag}([\\s>]|$)`, 'i').test(tLow));

                    if (isSafe) {
                        if (/^<(table|p|ul|ol|dl)([\s>]|$)/i.test(tLow)) {
                            finalHtml += token.replace(/^<([a-z0-9\-]+)/i, '<$1 style="margin-bottom: 20px !important; opacity:0.75;" ');
                        } else {
                            finalHtml += token; // Preserve structural tags so table doesn't collapse
                        }
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
