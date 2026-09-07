function clearHighlights() {
    let target = document.querySelector('.rst-content') || document.body;
    if (target.hasAttribute('data-original-html')) {
        // Restore the exact original HTML to fix any broken tables
        target.innerHTML = target.getAttribute('data-original-html');
        target.removeAttribute('data-original-html');
    }
    // Clean up any residual styles
    document.querySelectorAll('.diff-add, .diff-del').forEach(el => {
        el.style.backgroundColor = '';
        el.style.textDecoration = '';
    });
}

async function applyDiff(baseHTML, currentDoc) {
    // Save original HTML so we can restore it perfectly
    let mainContent = currentDoc.querySelector('.rst-content') || currentDoc.body;
    mainContent.setAttribute('data-original-html', mainContent.innerHTML);

    // Reuse your ORIGINAL diff_match_patch tokenization logic here!
    // (Example of your original logic...)
    let oldTokens = tokenize(baseHTML);
    let newTokens = tokenize(mainContent.innerHTML);
    
    let diffs = dmp.diff_main(oldTokens, newTokens);
    dmp.diff_cleanupSemantic(diffs);

    // THE CRITICAL FIX FOR TABLES:
    // Instead of doing a string replace and shoving it into innerHTML (which breaks tables),
    // we rebuild the HTML string SAFELY.
    let finalHtml = '';
    
    diffs.forEach(part => {
        const op = part[0]; 
        const text = part[1];

        if (op === 0) {
            finalHtml += text;
        } else if (op === 1) {
            // Added text (Green)
            finalHtml += `<span class="diff-add" style="background-color:#a5f3a5; color:#155724;">${text}</span>`;
        } else if (op === -1) {
            // Removed text (Red)
            finalHtml += `<span class="diff-del" style="background-color:#f3a5a5; color:#721c24; text-decoration: line-through;">${text}</span>`;
        }
    });

    // Apply the final HTML to the main content only.
    // This inherently ignores the sidebars, so no double headings.
    mainContent.innerHTML = finalHtml;
    
    // POST-PROCESSING FIX FOR TABLES:
    // This moves text that escaped the table back inside if the browser broke it.
    mainContent.querySelectorAll('table').forEach(table => {
        let previousNode = table.previousElementSibling;
        // If raw text fell below the table, move it up to where the table started
        if (previousNode && previousNode.nodeType === 3) {
             table.parentNode.insertBefore(previousNode, table);
        }
    });

    showToast('Visual Diff : ON', 'success');
}
