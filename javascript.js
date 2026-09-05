function applyDiff(baseHTML, currentDoc) {
    let baseDoc = new DOMParser().parseFromString(baseHTML, 'text/html');
    let baseContent = getContentArea(baseDoc);
    let currentContent = getContentArea(currentDoc);

    if (!baseContent || !currentContent) {
        console.error('Could Not Find Content Area');
        return;
    }

    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

    const dmp = new window.diff_match_patch();

    // 1. THE MAGIC REGEX FIX
    function tokenize(html) {
        let tokens = [];
        // Matches entire table rows FIRST, then other tags, then words, then spaces.
        let regex = /(<tr[^>]*>[\s\S]*?<\/tr>)|(<[^>]+>)|([^<>\s]+)|(\s+)/gi;
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

    let finalHtml = '';
    // Notice 'tr' is removed from safe tags because we handle it dynamically below
    let safeTags = ['table', 'thead', 'tbody', 'th', 'td', 'ul', 'ol', 'li', 'div', 'dl', 'dt', 'dd'];

    for (let i = 0; i < diffs.length; i++) {
        let op = diffs[i][0];
        let chars = diffs[i][1];

        for (let j = 0; j < chars.length; j++) {
            let token = charToToken.get(chars[j]);
            
            // Check if this token is our unbreakable table row
            let isRow = /^<tr/i.test(token) && /<\/tr>$/i.test(token);
            let isTag = token.startsWith('<') && token.endsWith('>') && !isRow;
            let isWhitespace = /^\s+$/.test(token);

            if (isRow) {
                if (op === 0) {
                    finalHtml += token;
                } else if (op === 1) {
                    // Added row: inject green inline styles perfectly into the tags
                    let styled = token.replace(/<tr/gi, '<tr style="background-color: #d4fcbc !important; color: #155724 !important;"')
                                      .replace(/<td/gi, '<td style="background-color: #d4fcbc !important; color: #155724 !important;"');
                    finalHtml += styled;
                } else if (op === -1) {
                    // Deleted row: inject red inline styles perfectly into the tags
                    let styled = token.replace(/<tr/gi, '<tr style="background-color: #ffdce0 !important; color: #b31d28 !important; text-decoration: line-through;"')
                                      .replace(/<td/gi, '<td style="background-color: #ffdce0 !important; color: #b31d28 !important; text-decoration: line-through;"');
                    finalHtml += styled;
                }
            } else if (isTag) {
                let t = token.toLowerCase();
                let isSafe = safeTags.some(tag => 
                    t.startsWith('<' + tag + '>') || 
                    t.startsWith('<' + tag + ' ') || 
                    t.startsWith('</' + tag + '>')
                );

                if (isSafe) {
                    finalHtml += token;
                } else {
                    if (op === 0 || op === 1) finalHtml += token;
                }
            } else {
                if (op === 0) {
                    finalHtml += token;
                } else if (op === 1) {
                    if (isWhitespace) finalHtml += token;
                    else finalHtml += `<ins style="background: #d4fcbc; color: #155724; text-decoration: none; border-radius: 2px; padding: 1px 2px;">${token}</ins>`;
                } else if (op === -1) {
                    if (isWhitespace) finalHtml += token;
                    else finalHtml += `<del style="background: #ffdce0; color: #b31d28; text-decoration: line-through; border-radius: 2px; padding: 1px 2px;">${token}</del>`;
                }
            }
        }
    }

    currentContent.innerHTML = finalHtml;
    return 1;
}
