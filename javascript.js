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


// PRODUCTION FIX: Stops table diffs from sliding diagonally
function injectRowAnchors(contentBlock) {
    contentBlock.querySelectorAll('tr').forEach(tr => {
        // 1. Create a unique, unbroken text string from the row's data
        let rowFingerprint = tr.innerText.replace(/\s+/g, '').substring(0, 50);
        
        // 2. Create an invisible anchor
        let anchor = document.createElement('span');
        anchor.className = 'row-diff-anchor';
        anchor.style.display = 'none';
        anchor.innerText = `__ANCHOR_${rowFingerprint}__`; // Unique single token
        
        // 3. Inject it into the very first cell of the row
        let firstCell = tr.querySelector('td, th');
        if (firstCell) {
            firstCell.insertBefore(anchor, firstCell.firstChild);
        }
    });
}






    // ... your existing code above ...
    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

    // --- 1. INJECT ANCHORS ---
    injectRowAnchors(baseContent);
    injectRowAnchors(currentContent);

    // --- 2. RUN SCRIPT ---
    let diffHTML = HtmlDiff.default.execute(baseContent.innerHTML, currentContent.innerHTML);
    currentContent.innerHTML = diffHTML;

    // --- 3. CLEANUP ANCHORS ---
    // Instantly removes the invisible anchors before the user sees the page
    currentContent.querySelectorAll('.row-diff-anchor').forEach(el => el.remove());

    // ... your existing color styling code below ...

