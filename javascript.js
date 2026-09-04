function robustTableDiff(oldContainer, newContainer) {
    let oldTables = oldContainer.querySelectorAll('table');
    let newTables = newContainer.querySelectorAll('table');

    for (let i = 0; i < newTables.length; i++) {
        if (!oldTables[i]) continue;

        let oldRows = Array.from(oldTables[i].querySelectorAll('tr'));
        let newRows = Array.from(newTables[i].querySelectorAll('tr'));

        // Extract raw text to compare row-by-row
        let oldRowTexts = oldRows.map(r => r.innerText.trim());
        let newRowTexts = newRows.map(r => r.innerText.trim());

        let insertedCount = 0;

        // 1. Find Deleted Rows from the old version and inject them safely
        oldRows.forEach((oldRow, index) => {
            let text = oldRow.innerText.trim();
            if (!newRowTexts.includes(text)) {
                let deletedRow = oldRow.cloneNode(true);
                deletedRow.classList.add('diff-deleted-row');
                
                // Insert it safely into the new table so structure NEVER breaks
                let targetIndex = Math.min(index + insertedCount, newTables[i].rows.length);
                let refRow = newTables[i].rows[targetIndex];
                
                if (refRow && refRow.parentNode) {
                    refRow.parentNode.insertBefore(deletedRow, refRow);
                } else if (newTables[i].querySelector('tbody')) {
                    newTables[i].querySelector('tbody').appendChild(deletedRow);
                }
                insertedCount++;
            }
        });

        // 2. Find Added Rows in the new version
        newRows.forEach(newRow => {
            let text = newRow.innerText.trim();
            if (!oldRowTexts.includes(text)) {
                newRow.classList.add('diff-added-row');
            }
        });

        // 3. Mark table so your text-diff library ignores it (prevents UI breaking)
        newTables[i].classList.add('diff-processed-table');
        newTables[i].setAttribute('data-diff-ignore', 'true');
    }
}
