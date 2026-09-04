    currentContent.innerHTML = finalHtml;

    // --- 3. RESTORE TABLES AND APPLY ROBUST ROW DIFF ---
    try {
        let placeholders = currentContent.querySelectorAll('.diff-table-placeholder');

        placeholders.forEach((ph) => {
            let idx = parseInt(ph.getAttribute('data-table-index'));
            let newTable = newTables[idx];
            let oldTable = oldTables[idx];
            
            if (newTable) {
                // 1. Restore the new table safely back into the DOM
                if (ph.parentNode) ph.parentNode.replaceChild(newTable, ph);

                // 2. Diff the rows safely
                if (oldTable) {
                    let oldRows = Array.from(oldTable.querySelectorAll('tr'));
                    let newRows = Array.from(newTable.querySelectorAll('tr'));
                    
                    // CRITICAL FIX: Use textContent instead of innerText to prevent detachment crashes!
                    let oldRowTexts = oldRows.map(r => (r.textContent || '').trim());
                    let newRowTexts = newRows.map(r => (r.textContent || '').trim());
                    let insertedCount = 0;

                    oldRows.forEach((oldRow, index) => {
                        let text = (oldRow.textContent || '').trim();
                        if (!newRowTexts.includes(text)) {
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
                        let text = (newRow.textContent || '').trim();
                        if (!oldRowTexts.includes(text)) {
                            newRow.classList.add('diff-added-row');
                        }
                    });
                }
            } else if (oldTable) {
                // FALLBACK: If the whole table was deleted in the new version, show the old one in red
                oldTable.classList.add('diff-deleted-row');
                if (ph.parentNode) ph.parentNode.replaceChild(oldTable, ph);
            }
        });
    } catch (err) {
        console.error("Visual Diff Table Restore Error:", err);
    }

    return 1;
