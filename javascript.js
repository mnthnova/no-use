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


















    
