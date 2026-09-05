// ============================================================
// NEW — put these above applyDiff (anywhere at top level is fine)
// ============================================================

function wordSimilarity(a, b) {
    let wa = (a || '').toLowerCase().match(/[a-z0-9]+/g) || [];
    let wb = (b || '').toLowerCase().match(/[a-z0-9]+/g) || [];
    if (!wa.length && !wb.length) return 1;
    let setA = new Set(wa), setB = new Set(wb);
    let inter = 0;
    setA.forEach(w => { if (setB.has(w)) inter++; });
    let union = new Set([...wa, ...wb]).size;
    return union === 0 ? 1 : inter / union;
}

// Needleman-Wunsch style fuzzy alignment. Works for <tr> rows AND <table>s.
function alignByText(oldArr, newArr, textFn, opts = {}) {
    const equalThreshold = opts.equalThreshold ?? 0.999;
    const minSimilarity  = opts.minSimilarity  ?? 0.25;
    const GAP = 0.35;

    const n = oldArr.length, m = newArr.length;
    let sim = Array.from({ length: n }, () => new Array(m).fill(0));
    for (let i = 0; i < n; i++)
        for (let j = 0; j < m; j++)
            sim[i][j] = wordSimilarity(textFn(oldArr[i]), textFn(newArr[j]));

    let score = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) score[i][0] = -GAP * i;
    for (let j = 1; j <= m; j++) score[0][j] = -GAP * j;
    for (let i = 1; i <= n; i++)
        for (let j = 1; j <= m; j++)
            score[i][j] = Math.max(
                score[i-1][j-1] + sim[i-1][j-1],
                score[i-1][j] - GAP,
                score[i][j-1] - GAP
            );

    let result = [], i = n, j = m;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && Math.abs(score[i][j] - (score[i-1][j-1] + sim[i-1][j-1])) < 1e-9) {
            let s = sim[i-1][j-1];
            if (s < minSimilarity) {
                result.unshift({ type: 'delete', oldItem: oldArr[i-1], newItem: null });
                result.push({ type: 'insert', oldItem: null, newItem: newArr[j-1] });
            } else {
                result.unshift({ type: s >= equalThreshold ? 'equal' : 'modified', oldItem: oldArr[i-1], newItem: newArr[j-1] });
            }
            i--; j--; continue;
        }
        if (i > 0 && Math.abs(score[i][j] - (score[i-1][j] - GAP)) < 1e-9) {
            result.unshift({ type: 'delete', oldItem: oldArr[i-1], newItem: null }); i--; continue;
        }
        result.unshift({ type: 'insert', oldItem: null, newItem: newArr[j-1] }); j--;
    }
    return result;
}

// Diff two matched <tr> cell-by-cell. Only touches plain-text cells inline;
// cells with nested markup just get flagged, never shredded.
function diffTableRowCells(oldRow, newRow, dmp, counter) {
    let oldCells = [...oldRow.children].filter(c => c.tagName === 'TD' || c.tagName === 'TH');
    let newCells = [...newRow.children].filter(c => c.tagName === 'TD' || c.tagName === 'TH');

    if (oldCells.length !== newCells.length) {
        newRow.setAttribute('data-diff', 'modified-row');
        newRow.style.background = '#fff8e1';
        counter.n++;
        return;
    }

    let rowChanged = false;
    for (let k = 0; k < newCells.length; k++) {
        let oldTxt = oldCells[k].textContent.trim();
        let newTxt = newCells[k].textContent.trim();
        if (oldTxt === newTxt) continue;
        rowChanged = true;
        counter.n++;

        if (newCells[k].children.length > 0) {
            // has nested markup — don't risk shredding it, just flag the cell
            newCells[k].style.background = '#fff8e1';
            newCells[k].setAttribute('data-diff', 'changed-cell');
            continue;
        }
        let cellDiffs = dmp.diff_main(oldTxt, newTxt);
        dmp.diff_cleanupSemantic(cellDiffs);
        let html = '';
        cellDiffs.forEach(([op, text]) => {
            if (op === 0) html += text;
            else if (op === 1) html += `<ins style="background:#d4fcbc;color:#155724;border-radius:2px;padding:1px 2px;">${text}</ins>`;
            else html += `<del style="background:#ffdce0;color:#b31d28;text-decoration:line-through;border-radius:2px;padding:1px 2px;">${text}</del>`;
        });
        newCells[k].innerHTML = html;
        newCells[k].setAttribute('data-diff', 'changed-cell');
    }
    if (rowChanged) newRow.setAttribute('data-diff', 'modified-row');
}

function processTable(oldTable, newTable, dmp, counter) {
    let oldRows = [...oldTable.querySelectorAll('tr')];
    let newRows = [...newTable.querySelectorAll('tr')];
    let rowText = tr => tr.textContent.replace(/\s+/g, ' ').trim();
    let alignment = alignByText(oldRows, newRows, rowText, { equalThreshold: 0.999, minSimilarity: 0.3 });
    let anchor = null;

    alignment.forEach(step => {
        if (step.type === 'equal') { anchor = step.newItem; }
        else if (step.type === 'modified') { diffTableRowCells(step.oldItem, step.newItem, dmp, counter); anchor = step.newItem; }
        else if (step.type === 'insert') {
            step.newItem.style.background = '#d4fcbc';
            step.newItem.setAttribute('data-diff', 'inserted-row');
            anchor = step.newItem; counter.n++;
        } else if (step.type === 'delete') {
            let ghost = step.oldItem.cloneNode(true);
            ghost.setAttribute('data-diff', 'deleted-row');
            ghost.style.background = '#ffdce0';
            ghost.querySelectorAll('td,th').forEach(c => c.style.textDecoration = 'line-through');
            let parent = anchor ? anchor.parentNode : (newTable.querySelector('tbody') || newTable);
            let ref = anchor ? anchor.nextSibling : parent.firstChild;
            parent.insertBefore(ghost, ref);
            anchor = ghost; counter.n++;
        }
    });
}

// Aligns whole <table> elements, handles wholesale add/remove, delegates
// matched pairs to processTable. Returns alignment (with ghost refs)
// so applyDiff can mask+splice tables around the prose diff.
function diffTables(baseContent, currentContent, dmp, counter) {
    let oldTables = [...baseContent.querySelectorAll('table')];
    let newTables = [...currentContent.querySelectorAll('table')];
    if (!oldTables.length && !newTables.length) return [];

    let sig = t => t.textContent.replace(/\s+/g, ' ').trim().slice(0, 400);
    let alignment = alignByText(oldTables, newTables, sig, { equalThreshold: 0.999, minSimilarity: 0.15 });
    let anchor = null;

    alignment.forEach(step => {
        if (step.type === 'equal') { anchor = step.newItem; }
        else if (step.type === 'modified') { processTable(step.oldItem, step.newItem, dmp, counter); anchor = step.newItem; }
        else if (step.type === 'insert') {
            step.newItem.style.borderLeft = '4px solid #28a745';
            step.newItem.setAttribute('data-diff', 'inserted-table');
            anchor = step.newItem; counter.n++;
        } else if (step.type === 'delete') {
            let ghost = step.oldItem.cloneNode(true);
            ghost.setAttribute('data-diff', 'deleted-table');
            ghost.style.borderLeft = '4px solid #dc3545';
            ghost.style.opacity = '0.75';
            ghost.querySelectorAll('td,th').forEach(c => c.style.textDecoration = 'line-through');
            let parent = anchor ? anchor.parentNode : (newTables[0] ? newTables[0].parentNode : currentContent);
            let ref = anchor ? anchor.nextSibling : (newTables[0] || null);
            parent.insertBefore(ghost, ref);
            step.ghost = ghost;
            anchor = ghost; counter.n++;
        }
    });
    return alignment;
}

// Replaces every table on both sides with an identical opaque placeholder
// token, so your tokenizer/assembly loop below never sees table markup.
function maskTablesForProse(baseContent, currentContent, tableAlignment) {
    let baseMap = new Map(), currentMap = new Map(), n = 0;
    tableAlignment.forEach(step => {
        let id = `TBLPLACEHOLDER${n++}`;
        if (step.type === 'equal' || step.type === 'modified') {
            baseMap.set(step.oldItem, id); currentMap.set(step.newItem, id);
        } else if (step.type === 'delete') {
            baseMap.set(step.oldItem, id);
            if (step.ghost) currentMap.set(step.ghost, id);
        } else if (step.type === 'insert') {
            currentMap.set(step.newItem, id);
        }
    });

    function buildMasked(root, map) {
        let clone = root.cloneNode(true);
        let origTables = [...root.querySelectorAll('table')];
        let cloneTables = [...clone.querySelectorAll('table')];
        origTables.forEach((origT, idx) => {
            if (map.has(origT)) {
                let span = document.createElement('span');
                span.textContent = map.get(origT);
                cloneTables[idx].replaceWith(span);
            }
        });
        return clone.innerHTML;
    }
    return { baseHTML: buildMasked(baseContent, baseMap), currentHTML: buildMasked(currentContent, currentMap) };
}



function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    let parser = new DOMParser();
    let baseDoc = parser.parseFromString(baseHTML, 'text/html');

    let baseContent = getContentArea(baseDoc);
    let currentContent = getContentArea(currentDoc);

    if (!baseContent || !currentContent) return;

    const dmp = new window.diff_match_patch();
    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

    // --- NEW: STEP 1 — structural table diff, before anything else touches tables ---
    let counter = { n: 0 };
    let tableAlignment = diffTables(baseContent, currentContent, dmp, counter);
    let { baseHTML: maskedBase, currentHTML: maskedCurrent } = maskTablesForProse(baseContent, currentContent, tableAlignment);

    // --- THE FIX: STRIP SPHINX NOISE (unchanged, now runs on masked HTML) ---
    function sanitizeSphinxNoise(html) {
        return html
            .replace(/\s+id="id\d+"/gi, '')
            .replace(/\s+class="[^"]*(?:row-odd|row-even)[^"]*"/gi, '');
    }

    let oldHtmlString = sanitizeSphinxNoise(maskedBase);
    let newHtmlString = sanitizeSphinxNoise(maskedCurrent);

    // --- YOUR EXACT ORIGINAL TOKENIZER --- (unchanged)
    function tokenize(html) {
        let tokens = [];
        let regex = /(<[^>]+>)|([^<>\s]+)|(\s+)/g;
        let match;
        while ((match = regex.exec(html)) !== null) tokens.push(match[0]);
        return tokens;
    }

    let oldTokens = tokenize(oldHtmlString);
    let newTokens = tokenize(newHtmlString);

    let tokenToChar = new Map();
    let charToToken = new Map();
    let nextCharCode = 0xE000;
    function tokenToString(tokens) {
        let str = '';
        for (let token of tokens) {
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

    // --- YOUR EXACT ORIGINAL ASSEMBLY LOOP --- (unchanged, counter added)
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
                    let safeTags = ['table','thead','tbody','tr','th','td','ul','ol','li','div','dl','dt','dd'];
                    let isSafe = safeTags.some(tag =>
                        t.startsWith('<' + tag + '>') || t.startsWith('<' + tag + ' ') || t.startsWith('</' + tag + '>')
                    );
                    if (isSafe) {
                        if (t.startsWith('<table') || t.startsWith('<ul') || t.startsWith('<ol')) {
                            finalHtml += token.replace(/^<([a-zA-Z0-9]+)/, '<$1 style="margin-bottom:20px !important;');
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
                        finalHtml += `<ins style="background:#d4fcbc;color:#155724;text-decoration:none;border-radius:2px;padding:1px 2px;">${token}</ins>`;
                        counter.n++;
                    }
                } else if (op === -1) {
                    if (!isWhitespace && !isAutoNum) {
                        finalHtml += `<del style="background:#ffdce0;color:#b31d28;text-decoration:line-through;border-radius:2px;padding:1px 2px;">${token}</del>`;
                        counter.n++;
                    }
                }
            }
        }
    }

    // --- NEW: STEP 2 — splice the already-diffed real tables back into their placeholder spots ---
    let n = 0;
    tableAlignment.forEach(step => {
        let id = `TBLPLACEHOLDER${n++}`;
        let realHtml = step.type === 'delete'
            ? (step.ghost ? step.ghost.outerHTML : step.oldItem.outerHTML)
            : step.newItem.outerHTML;
        let re = new RegExp('<span[^>]*>' + id + '</span>', 'g');
        finalHtml = finalHtml.replace(re, realHtml);
    });

    currentContent.innerHTML = finalHtml;
    return counter.n; // <-- real change count, not a hardcoded 1
}


