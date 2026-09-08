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



// PRODUCTION FIX: "The Word-Locking Trick" (With True Hashing)
function lockTableWords(contentBlock) {
    // Math function that scrambles a string into a unique short ID
    function getHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36); // Returns a short alphanumeric string
    }

    contentBlock.querySelectorAll('tr').forEach(tr => {
        // 1. Get the row text, strip spaces, and generate a TRUE unique hash
        let rowText = tr.innerText || tr.textContent || '';
        let fingerprint = getHash(rowText.replace(/\s+/g, ''));
        
        // 2. Find every text piece inside this row
        let walker = document.createTreeWalker(tr, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            // 3. Attach the unique hash to EVERY word
            if (node.nodeValue.trim() !== '') {
                node.nodeValue = node.nodeValue.replace(/([^\s]+)/g, `$1___${fingerprint}___`);
            }
        }
    });
}


    // ... your existing setup code above ...
    currentContent.setAttribute('data-original-html', currentContent.innerHTML);

    // --- 1. LOCK WORDS TO THEIR ROWS ---
    lockTableWords(baseContent);
    lockTableWords(currentContent);

    // --- 2. RUN ENGINE ---
    let rawDiffHTML = HtmlDiff.default.execute(baseContent.innerHTML, currentContent.innerHTML);

    // --- 3. CLEANUP (REMOVE SECRET LABELS) ---
    // This strips out the ___fingerprint___ from the final HTML string before the user ever sees it
    let cleanDiffHTML = rawDiffHTML.replace(/___[a-zA-Z0-9]*___/g, '');
    
    // Safely inject the perfectly merged and cleaned HTML back into the DOM
    currentContent.innerHTML = cleanDiffHTML;

    // ... your existing CSS color styling below ...




// PRODUCTION FIX: "Table-Level Density Lock"
function lockTableWords(contentBlock) {
    function getHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(36);
    }

    // Evaluate each TABLE as one complete unit, not row-by-row
    contentBlock.querySelectorAll('table').forEach(table => {
        let tbody = table.querySelector('tbody');
        if (!tbody) return;

        // 1. Count all words in the entire table body
        let words = tbody.innerText.trim().split(/\s+/).filter(w => w.length > 0);
        
        // 2. Count all data cells in the entire table body
        let cells = tbody.querySelectorAll('td');
        
        let wordCount = words.length;
        let cellCount = cells.length || 1; 
        
        // --- THE TABLE-WIDE METRIC ---
        // Calculate the average density of the entire table
        let tableAvgDensity = wordCount / cellCount;
        
        // If the table as a whole averages more than 3 words per cell, 
        // it is a Prose/Revision table. Skip the ENTIRE table immediately.
        if (tableAvgDensity > 3) {
            return; 
        }
        
        // Otherwise, the table is a strict Data Grid. Lock ALL of its rows.
        tbody.querySelectorAll('tr').forEach(tr => {
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
    });
}

    
