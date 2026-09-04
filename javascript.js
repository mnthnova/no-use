// --- 1. ISOLATE TABLES BEFORE STRING DIFF ---
let oldTables = Array.from(baseContent.querySelectorAll('table'));
let newTables = Array.from(currentContent.querySelectorAll('table'));

// Make placeholders EXACTLY identical so diff_match_patch ignores them
oldTables.forEach((table, i) => {
    let ph = baseDoc.createElement('div');
    ph.className = 'diff-table-placeholder';
    ph.setAttribute('data-table-index', i);
    table.parentNode.replaceChild(ph, table);
});

newTables.forEach((table, i) => {
    let ph = currentDoc.createElement('div');
    ph.className = 'diff-table-placeholder';
    ph.setAttribute('data-table-index', i);
    table.parentNode.replaceChild(ph, table);
});

// ... YOUR diff_match_patch tokenizing logic stays here ...

currentContent.innerHTML = finalHtml; 

// --- 3. RESTORE TABLES AND APPLY ROBUST ROW DIFF ---
let placeholders = currentContent.querySelectorAll('.diff-table-placeholder');

placeholders.forEach((ph) => {
    // Grab the exact index from the placeholder attribute
    let idx = parseInt(ph.getAttribute('data-table-index'));
    let newTable = newTables[idx];
    let oldTable = oldTables[idx];
    
    if (newTable) {
        // 1. ALWAYS restore the table into the DOM, even if it's brand new
        ph.parentNode.replaceChild(newTable, ph);

        // 2. Only do the row-diff mapping if the table existed in the old version too
        if (oldTable) {
            let oldRows = Array.from(oldTable.querySelectorAll('tr'));
            let newRows = Array.from(newTable.querySelectorAll('tr'));
            
            let oldRowTexts = oldRows.map(r => r.innerText.trim());
            let newRowTexts = newRows.map(r => r.innerText.trim());
            let insertedCount = 0;

            oldRows.forEach((oldRow, index) => {
                if (!newRowTexts.includes(oldRow.innerText.trim())) {
                    let deletedRow = oldRow.cloneNode(true);
                    deletedRow.classList.add('diff-deleted-row');
                    
                    let targetIndex = Math.min(index + insertedCount, newTable.rows.length);
                    let refRow = newTable.rows[targetIndex];
                    
                    if (refRow && refRow.parentNode) {
                        refRow.parentNode.insertBefore(deletedRow, refRow);
                    } else if (newTable.querySelector('tbody')) {
                        newTable.querySelector('tbody').appendChild(deletedRow);
                    }
                    insertedCount++;
                }
            });

            newRows.forEach(newRow => {
                if (!oldRowTexts.includes(newRow.innerText.trim())) {
                    newRow.classList.add('diff-added-row');
                }
            });
        }
    }
});

