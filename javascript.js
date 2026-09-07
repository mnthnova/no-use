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
