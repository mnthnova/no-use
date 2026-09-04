currentContent.innerHTML = finalHtml; // Your existing line

// --- 3. RESTORE TABLES AND APPLY ROBUST ROW DIFF ---
let placeholders = currentContent.querySelectorAll('.diff-table-placeholder');

placeholders.forEach((ph, i) => {
    let newTable = newTables[i];
    let oldTable = oldTables[i];
    
    if (newTable && oldTable) {
        // Put the table back into the DOM where the placeholder was
        ph.parentNode.replaceChild(newTable, ph);

        let oldRows = Array.from(oldTable.querySelectorAll('tr'));
        let newRows = Array.from(newTable.querySelectorAll('tr'));
        
        // Extract raw text to compare row-by-row
        let oldRowTexts = oldRows.map(r => r.innerText.trim());
        let newRowTexts = newRows.map(r => r.innerText.trim());
        let insertedCount = 0;

        // Find Deleted Rows from the old version and inject them safely
        oldRows.forEach((oldRow, index) => {
            if (!newRowTexts.includes(oldRow.innerText.trim())) {
                let deletedRow = oldRow.cloneNode(true);
                deletedRow.classList.add('diff-deleted-row');
                
                // Insert safely so structure NEVER breaks
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

        // Find Added Rows in the new version
        newRows.forEach(newRow => {
            if (!oldRowTexts.includes(newRow.innerText.trim())) {
                newRow.classList.add('diff-added-row');
            }
        });
    }
});

return 1; // Your existing return




/* When diff is active, show deleted rows in red */
.diff-deleted-row { 
    background-color: #ffdce0 !important; 
    color: #b31d28 !important; 
    text-decoration: line-through; 
}
.diff-deleted-row td, .diff-deleted-row th {
    text-decoration: line-through;
}

/* When diff is active, show added rows in green */
.diff-added-row { 
    background-color: #d4fcbc !important; 
    color: #155724 !important; 
}

/* --- OPTIONAL: If you need to hide deleted rows when diff is OFF --- */
/* If you ever strip the 'diffActive' state, you can hide them instantly: */
body:not(.diff-active) .diff-deleted-row {
    display: none !important;
}
body:not(.diff-active) .diff-added-row {
    background-color: inherit !important;
    color: inherit !important;
}
