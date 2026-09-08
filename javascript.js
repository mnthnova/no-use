// Apply Visual Diff By Comparing HTML AST Nodes
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

    // Save original state so clearHighlights() can revert it safely
    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

    // Execute the HTML-aware AST diff.
    // This automatically handles merged table rows and missing nodes without breaking layout.
    // It strictly outputs clean HTML with <del> and <ins> applied only to text.
    let diffHTML = HtmlDiff.execute(baseContent.innerHTML, currentContent.innerHTML);

    // Safely inject the perfectly merged HTML back into the DOM
    currentContent.innerHTML = diffHTML;

    // Apply your custom inline styling dynamically to the injected tags
    let inserted = currentContent.querySelectorAll('ins');
    inserted.forEach(el => {
        el.style.setProperty('background', '#d4fcbc', 'important');
        el.style.setProperty('color', '#155724', 'important');
        el.style.setProperty('text-decoration', 'none', 'important');
        el.style.setProperty('border-radius', '2px', 'important');
        el.style.setProperty('padding', '1px 2px', 'important');
    });

    let deleted = currentContent.querySelectorAll('del');
    deleted.forEach(el => {
        el.style.setProperty('background', '#ffdce0', 'important');
        el.style.setProperty('color', '#b31d28', 'important');
        el.style.setProperty('text-decoration', 'line-through', 'important');
        el.style.setProperty('border-radius', '2px', 'important');
        el.style.setProperty('padding', '1px 2px', 'important');
    });
}

https://cdn.jsdelivr.net/npm/htmldiff-js@1.0.5/dist/htmldiff.min.js](https://cdn.jsdelivr.net/npm/htmldiff-js@1.0.5/dist/htmldiff.min.js

// PRODUCTION FIX: "The Smart Lock" (Hybrid Approach)
function lockTableWords(contentBlock) {
    function getHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(36);
    }

    contentBlock.querySelectorAll('tr').forEach(tr => {
        let rowText = tr.innerText || tr.textContent || '';
        
        // --- THE SMART BYPASS ---
        // Count how many words are in this specific row
        let wordCount = rowText.trim().split(/\s+/).length;
        
        // If the row has more than 12 words (e.g., Revision History sentences),
        // instantly skip it. This preserves perfect single-word highlighting for text blocks.
        if (wordCount > 12) {
            return; 
        }
        
        // If it has 12 words or fewer (e.g., Capacity & SSID Data Tables),
        // apply the lock to prevent the diagonal sliding bug.
        let fingerprint = getHash(rowText.replace(/\s+/g, ''));
        let walker = document.createTreeWalker(tr, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeValue.trim() !== '') {
                // Using the safe _DIFFLOCK_ delimiter
                node.nodeValue = node.nodeValue.replace(/([^\s]+)/g, `$1_DIFFLOCK_${fingerprint}_DIFFLOCK_`);
            }
        }
    });
}













// PRODUCTION FIX: "Synchronized Table Locking"
function syncAndLockTables(baseContent, currentContent) {
    function getHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(36);
    }

    // Grab all tables from both the Old and New documents
    let baseTables = Array.from(baseContent.querySelectorAll('table'));
    let currTables = Array.from(currentContent.querySelectorAll('table'));
    let maxLen = Math.max(baseTables.length, currTables.length);

    // Pair the tables up and evaluate them together
    for (let i = 0; i < maxLen; i++) {
        let bTable = baseTables[i];
        let cTable = currTables[i];
        
        let maxWords = 0;
        
        // Helper to check the max words in any cell for a given table
        let checkMax = (table) => {
            if (!table) return;
            table.querySelectorAll('td').forEach(td => {
                let count = (td.innerText || '').trim().split(/\s+/).filter(w => w.length > 0).length;
                if (count > maxWords) maxWords = count;
            });
        };
        
        // 1. Check BOTH the old and new versions of this table
        checkMax(bTable);
        checkMax(cTable);
        
        // 2. THE SYNC FIX: If EITHER version has a cell with 6+ words, 
        // bypass BOTH versions. They stay perfectly in sync for word-level diffing!
        if (maxWords > 5) {
            continue; 
        }
        
        // 3. Otherwise, it is safely a Data Grid in both versions. Lock BOTH.
        let lockRows = (table) => {
            if (!table) return;
            table.querySelectorAll('tbody tr').forEach(tr => {
                let rowText = tr.innerText || tr.textContent || '';
                let fingerprint = getHash(rowText.replace(/\s+/g, ''));
                let walker = document.createTreeWalker(tr, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while ((node = walker.nextNode())) {
                    if (node.nodeValue.trim() !== '') {
                        node.nodeValue = node.nodeValue.replace(/([^\s]+)/g, `$1_DIFFLOCK_${fingerprint}_DIFFLOCK_`);
                    }
                }
            });
        };
        
        lockRows(bTable);
        lockRows(cTable);
    }
}



// --- 1. SYNC AND LOCK BOTH TOGETHER ---
    syncAndLockTables(baseContent, currentContent);

    // --- 2. RUN ENGINE ---
    let rawDiffHTML = HtmlDiff.default.execute(baseContent.innerHTML, currentContent.innerHTML);

    // --- 3. CLEANUP ---
    let cleanDiffHTML = rawDiffHTML.replace(/_DIFFLOCK_[a-zA-Z0-9]*_DIFFLOCK_/g, '');
    
    // --- 4. INJECT ---
    currentContent.innerHTML = cleanDiffHTML;





    
