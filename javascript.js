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
    
    // 🛑 CRITICAL FIX 1: Disable Timeout. 
    // Large tables take longer than 1 second to process. By default, DMP times out 
    // and just marks the ENTIRE table as deleted/inserted, causing duplicate headings 
    // and massive red/green blocks. This forces an exact word-by-word diff always.
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

    // 🛑 CRITICAL FIX 2: Tag Normalization.
    // Sphinx constantly changes IDs and classes (e.g., <tr class="row-even"> to <tr class="row-odd">).
    // If we diff the exact string, it deletes the old row and inserts a new one, nesting tags
    // and destroying the browser's table layout (causing raw text to dump outside).
    // This function tells the diff engine to ignore attribute changes on structural tags.
    function getTagBase(token) {
        let match = token.match(/^<(\/?)([a-z0-9\-]+)([\s>])/i);
        if (match) {
            let isClosing = match[1];
            let tagName = match[2].toLowerCase();
            // Added Sphinx-specific structure tags like colgroup, caption, span
            let structural = ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col', 'caption', 'ul', 'ol', 'li', 'div', 'dl', 'dt', 'dd', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
            if (structural.includes(tagName)) {
                return `<${isClosing}${tagName}>`; // Strips attributes just for the matching engine
            }
        }
        return token;
    }

    let tokenToChar = new Map();
    let charToTokenOld = new Map();
    let charToTokenNew = new Map();
    let nextCharCode = 0xE000;

    function mapTokens(tokens, isNew) {
        let str = '';
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            let normToken = getTagBase(token); // Use normalized tag for Diff matching
            
            if (!tokenToChar.has(normToken)) {
                let char = String.fromCharCode(nextCharCode++);
                tokenToChar.set(normToken, char);
            }
            let char = tokenToChar.get(normToken);
            
            // Save the EXACT original tokens so we can reconstruct the HTML perfectly
            if (isNew) {
                charToTokenNew.set(char, token);
            } else {
                if (!charToTokenOld.has(char)) {
                    charToTokenOld.set(char, token);
                }
            }
            str += char;
        }
        return str;
    }

    let oldStr = mapTokens(oldTokens, false);
    let newStr = mapTokens(newTokens, true);

    let diffs = dmp.diff_main(oldStr, newStr);

    // Keep this disabled. It scrambles HTML tags boundaries.
    // dmp.diff_cleanupSemantic(diffs);

    let finalHtml = '';

    for (let i = 0; i < diffs.length; i++) {
        let op = diffs[i][0];
        let chars = diffs[i][1];

        for (let j = 0; j < chars.length; j++) {
            let char = chars[j];
            let token = '';
            
            // 🛑 CRITICAL FIX 3: Smart Token Reconstruction.
            if (op === 1) {
                token = charToTokenNew.get(char); // Inserted
            } else if (op === -1) {
                token = charToTokenOld.get(char); // Deleted
            } else {
                // If unchanged but attributes shifted (e.g. IDs), prefer the NEW document's styling
                token = charToTokenNew.has(char) ? charToTokenNew.get(char) : charToTokenOld.get(char);
            }
            
            let isTag = /^<.*>$/.test(token);
            let isWhitespace = /^\s+$/.test(token);

            if (isTag) {
                let t = token.toLowerCase();
                // Expanded list to catch all structural elements Sphinx might use
                let safeTags = ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col', 'caption', 'ul', 'ol', 'li', 'div', 'dl', 'dt', 'dd', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
                
                let isSafe = safeTags.some(tag => new RegExp(`^</?${tag}([\\s>]|$)`, 'i').test(t));

                if (op === 0 || op === 1) {
                    finalHtml += token;
                } else if (op === -1) {
                    if (isSafe) {
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
