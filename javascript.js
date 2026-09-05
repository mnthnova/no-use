// 1. MAIN CONTROLLER: Protects tables and routes blocks to the inline differ
function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    let parser = new DOMParser();
    let baseDoc = parser.parseFromString(baseHTML, 'text/html');

    let baseContent = getContentArea(baseDoc);
    let currentContent = getContentArea(currentDoc);

    if (!baseContent || !currentContent) return;

    const dmp = new window.diff_match_patch();
    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

    // PROTECT TABLE ROWS: Highlight new rows entirely so the grid never breaks
    let baseRowsText = Array.from(baseContent.querySelectorAll('tr')).map(tr => tr.textContent.trim().replace(/\s+/g, ''));
    Array.from(currentContent.querySelectorAll('tr')).forEach(row => {
        if (!baseRowsText.includes(row.textContent.trim().replace(/\s+/g, ''))) {
            row.style.backgroundColor = 'rgba(212, 252, 188, 0.4)';
            row.setAttribute('data-diff-new-row', 'true');
        }
    });

    // EXTRACT BLOCKS: Only target p, li, td, th elements inside the content
    let baseElements = getContentElements(baseContent);
    let currentElements = getContentElements(currentContent);

    currentElements.forEach((currEl, index) => {
        if (currEl.closest('tr[data-diff-new-row="true"]')) return;

        let baseEl = baseElements[index];
        let newText = currEl.textContent || "";

        // Re-align elements if paragraphs shifted
        if (!baseEl || (baseEl.textContent !== newText && baseElements.some(el => el.textContent === newText))) {
            let foundMatch = baseElements.find(el => el.textContent === newText);
            if (foundMatch) baseEl = foundMatch;
        }

        if (baseEl) {
            // Only trigger the heavy token logic if the inner HTML actually changed
            if (baseEl.innerHTML !== currEl.innerHTML) {
                applyInlineDiff(currEl, baseEl.innerHTML, currEl.innerHTML, dmp);
            }
        } else {
            // Brand new structural block outside of a table
            currEl.style.borderLeft = '3px solid #28a745';
            currEl.style.backgroundColor = 'rgba(212, 252, 188, 0.3)';
            currEl.style.padding = '4px 8px';
        }
    });

    return 1;
}

// 2. INLINE DIFFER: Your exact word-by-word token logic, safely contained
function applyInlineDiff(currEl, oldHtml, newHtml, dmp) {
    const autoNumRegex = /^((?:Section\s+|Table\s+)?[\d\.]+\s+)/i;

    function tokenize(html) {
        let tokens = [];
        let regex = /(<[^>]+>)|([^<>\s]+)|(\s+)/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            tokens.push(match[0]);
        }
        return tokens;
    }

    let oldTokens = tokenize(oldHtml);
    let newTokens = tokenize(newHtml);

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

    diffs.forEach(part => {
        let op = part[0];
        let chars = part[1];

        for (let j = 0; j < chars.length; j++) {
            let token = charToToken.get(chars[j]);
            let isTag = token.startsWith('<') && token.endsWith('>');
            let isWhitespace = /^\s+$/.test(token);
            let isAutoNum = autoNumRegex.test(token);

            if (isTag) {
                // Pass inline formatting tags (like <span class="blue">) through safely
                finalHtml += token;
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
    });

    currEl.style.borderLeft = '3px solid #ffc107';
    currEl.style.paddingLeft = '8px';
    currEl.innerHTML = finalHtml;
}
