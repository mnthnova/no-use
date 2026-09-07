async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    let parser = new DOMParser();
    let baseDoc = parser.parseFromString(baseHTML, 'text/html');
    let baseContent = getContentArea(baseDoc);
    let currentContent = getContentArea(currentDoc);

    if (!baseContent || !currentContent) return;

    const dmp = new window.diff_match_patch();
    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

    // 1. TOKENIZE THE HTML
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

    // 2. NORMALIZE TOKENS (The Breakthrough)
    // We strip attributes from structural tags so Sphinx class/ID changes don't trick 
    // the diff engine into duplicating tags and breaking tables.
    function getNormalizedToken(token) {
        if (token.startsWith('<') && token.endsWith('>')) {
            let match = token.match(/^<\/?([a-zA-Z0-9]+)/);
            if (match) {
                let tag = match[1].toLowerCase();
                let structuralTags = ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'div', 'dl', 'dt', 'dd', 'caption', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
                if (structuralTags.includes(tag)) {
                    return match[0].toLowerCase() + '>'; // e.g., turns <tr class="odd"> into <tr>
                }
            }
        }
        // Remove Sphinx auto-numbers so they aren't diffed
        return token.replace(/^((?:Section\s+|Table\s+)?[\d\.]+\s+)/i, '');
    }

    let normToChar = new Map();
    let nextCharCode = 0xE000;

    function getCharForToken(token) {
        let norm = getNormalizedToken(token);
        if (!normToChar.has(norm)) {
            normToChar.set(norm, String.fromCharCode(nextCharCode++));
        }
        return normToChar.get(norm);
    }

    let oldStr = oldTokens.map(getCharForToken).join('');
    let newStr = newTokens.map(getCharForToken).join('');

    // 3. COMPUTE WORD-BY-WORD DIFF
    let diffs = dmp.diff_main(oldStr, newStr);
    dmp.diff_cleanupSemantic(diffs);

    // 4. ASSEMBLY LOOP WITH DUAL POINTERS
    // We walk through the exact changes, using the pointers to grab the REAL HTML 
    // (with correct attributes) so the layout stays flawless.
    let finalHtml = '';
    let oldIndex = 0;
    let newIndex = 0;
    const autoNumRegex = /^((?:Section\s+|Table\s+)?[\d\.]+\s+)/i;

    for (let i = 0; i < diffs.length; i++) {
        let op = diffs[i][0];
        let chars = diffs[i][1];

        for (let j = 0; j < chars.length; j++) {
            if (op === 0) {
                // Unchanged: Pull the NEW token so Sphinx classes update silently
                finalHtml += newTokens[newIndex];
                oldIndex++;
                newIndex++;
            } else if (op === 1) {
                // Inserted
                let token = newTokens[newIndex];
                let isTag = token.startsWith('<') && token.endsWith('>');
                let isWhitespace = /^\s+$/.test(token);
                let isAutoNum = autoNumRegex.test(token);

                if (isTag || isWhitespace || isAutoNum) {
                    finalHtml += token; // Render new tags/spaces normally
                } else {
                    finalHtml += `<ins style="background: #d4fcbc; color: #155724; text-decoration: none; border-radius: 2px; padding: 1px 2px;">${token}</ins>`;
                }
                newIndex++;
            } else if (op === -1) {
                // Deleted
                let token = oldTokens[oldIndex];
                let isTag = token.startsWith('<') && token.endsWith('>');
                let isWhitespace = /^\s+$/.test(token);
                let isAutoNum = autoNumRegex.test(token);

                if (isTag) {
                    let match = token.match(/^<\/?([a-zA-Z0-9]+)/);
                    let baseTag = match ? match[1].toLowerCase() : '';
                    let safeTags = ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'div', 'dl', 'dt', 'dd', 'caption'];
                    
                    if (safeTags.includes(baseTag)) {
                        // Render deleted structural tags safely so the layout grid doesn't collapse
                        if (token.toLowerCase().startsWith('<table') || token.toLowerCase().startsWith('<ul') || token.toLowerCase().startsWith('<ol') || token.toLowerCase().startsWith('<dl')) {
                            finalHtml += token.replace(/^<([a-zA-Z0-9]+)/, '<$1 style="margin-bottom: 20px !important; opacity: 0.5"');
                        } else {
                            finalHtml += token; 
                        }
                    } else {
                        finalHtml += token; // Keep deleted non-structural tags (like <b>) wrapped
                    }
                } else if (isWhitespace || isAutoNum) {
                    // Do nothing for deleted whitespace/auto-numbers
                } else {
                    finalHtml += `<del style="background: #ffdce0; color: #b31d28; text-decoration: line-through; border-radius: 2px; padding: 1px 2px;">${token}</del>`;
                }
                oldIndex++;
            }
        }
    }

    currentContent.innerHTML = finalHtml;
    console.log("Visual Diff applied successfully.");
    return 1;
}
