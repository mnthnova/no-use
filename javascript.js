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
        
        // 1. Count the exact number of words
        let words = rowText.trim().split(/\s+/).filter(w => w.length > 0);
        let wordCount = words.length;
        
        // 2. Count the exact number of cells in this specific row
        let cells = tr.querySelectorAll('th, td');
        let cellCount = cells.length || 1; // Fallback to 1 to prevent dividing by zero
        
        // --- THE UNIVERSAL METRIC ---
        // Calculate the average density of the cells
        let avgWordsPerCell = wordCount / cellCount;
        
        // If cells contain an average of more than 4 words, it is prose/sentences.
        // Skip it so htmldiff can highlight single-word changes beautifully.
        if (avgWordsPerCell > 4) {
            return; 
        }
        
        // If cells are sparse (like 1-3 words each), it is a Data Grid.
        // Apply the lock to mathematically prevent the diagonal sliding bug.
        let fingerprint = getHash(rowText.replace(/\s+/g, ''));
        let walker = document.createTreeWalker(tr, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeValue.trim() !== '') {
                node.nodeValue = node.nodeValue.replace(/([^\s]+)/g, `$1_DIFFLOCK_${fingerprint}_DIFFLOCK_`);
            }
        }
    });
}


    
