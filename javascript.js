// 1. The Main Diff Controller
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
    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

    // Phase 1: Protect Table Rows from breaking
    let baseRowsText = Array.from(baseContent.querySelectorAll('tr')).map(tr => tr.textContent.trim().replace(/\s+/g, ''));
    let currentRows = Array.from(currentContent.querySelectorAll('tr'));

    currentRows.forEach(row => {
        let rowText = row.textContent.trim().replace(/\s+/g, '');
        if (!baseRowsText.includes(rowText)) {
            // New row detected: highlight the whole row safely, skip cell-by-cell diff
            row.style.backgroundColor = '#d4fcbc'; 
            row.setAttribute('data-diff-new-row', 'true'); 
        }
    });

    // Phase 2: Get elements using your existing helper
    let baseElements = getContentElements(baseContent);
    let currentElements = getContentElements(currentContent);

    // Phase 3: Route to inline diffing
    currentElements.forEach((currEl, index) => {
        if (currEl.closest('tr[data-diff-new-row="true"]')) return; // Skip pre-handled new rows

        let baseEl = baseElements[index];
        let newText = currEl.textContent || "";

        // Re-align if paragraphs were added/removed
        if (!baseEl || (baseEl.textContent !== newText && baseElements.some(el => el.textContent === newText))) {
            let foundMatch = baseElements.find(el => el.textContent === newText);
            if (foundMatch) baseEl = foundMatch;
        }

        if (baseEl) {
            let oldText = baseEl.textContent || "";
            // Send to the helper function
            applyInlineDiff(currEl, oldText, newText, dmp);
        } else {
            // Entirely new block (e.g. a brand new paragraph)
            currEl.style.borderLeft = '3px solid #28a745';
            currEl.style.backgroundColor = 'rgba(212, 252, 188, 0.3)';
            currEl.style.padding = '4px 8px';
        }
    });

    return 1;
}

// 2. The Word-by-Word Inline Diff Helper
function applyInlineDiff(currEl, oldText, newText, dmp) {
    // Regex for Sphinx auto-numbers (e.g., "1. ", "1.2 ", "Section 3 ")
    const autoNumRegex = /^((?:Section\s+|Table\s+)?[\d\.]+\s+)/i;
    
    let oldClean = oldText.replace(autoNumRegex, '');
    let newClean = newText.replace(autoNumRegex, '');

    // Only process if the actual content changed
    if (oldClean !== newClean) {
        let diffs = dmp.diff_main(oldClean, newClean);
        dmp.diff_cleanupSemantic(diffs);

        let resultHtml = '';
        
        // Safely re-attach the auto-number prefix if it exists
        let match = newText.match(autoNumRegex);
        if (match) {
            resultHtml += match[0];
        }

        diffs.forEach(part => {
            const type = part[0]; 
            // Escape HTML characters so code snippets don't break the DOM
            const text = part[1].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            if (type === 0) {
                resultHtml += text;
            } else if (type === 1) {
                resultHtml += `<ins style="background: #d4fcbc; color: #155724; text-decoration: none; border-radius: 2px; padding: 1px 2px;">${text}</ins>`;
            } else if (type === -1) {
                resultHtml += `<del style="background: #ffdce0; color: #b31d28; text-decoration: line-through; border-radius: 2px; padding: 1px 2px;">${text}</del>`;
            }
        });

        // Apply visual markers to the container block
        currEl.style.borderLeft = '3px solid #ffc107';
        currEl.style.paddingLeft = '8px';
        
        // Inject the safe HTML back into the element
        currEl.innerHTML = resultHtml;
    }
}
