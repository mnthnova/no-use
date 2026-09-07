function clearHighlights() {
    let current = document.querySelector('.rst-content');
    if (current && current.hasAttribute('data-original-html')) {
        current.innerHTML = current.getAttribute('data-original-html');
        current.removeAttribute('data-original-html');
    }
    // Clear old styles just in case
    document.querySelectorAll('.rst-content *').forEach(el => {
        if (el.style.backgroundColor) el.style.backgroundColor = '';
        if (el.style.textDecoration) el.style.textDecoration = '';
    });
}

// 2. APPLY DIFF (String-to-String, Skips Side Menu)
async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();
    if (typeof diff_match_patch === 'undefined') return;

    // 1. Save original HTML to restore later
    let mainContent = document.querySelector('.rst-content');
    if (!mainContent) mainContent = currentDoc.body; // Fallback
    mainContent.setAttribute('data-original-html', mainContent.innerHTML);

    // 2. Parse only the main content area
    const parser = new DOMParser();
    const baseDoc = parser.parseFromString(baseHTML, 'text/html');
    let baseContent = baseDoc.querySelector('.rst-content');
    
    // If main area not found in base, use body (but skip sidebar)
    if (!baseContent) baseContent = baseDoc.body;

    // 3. Define the walker to ONLY hit text nodes, check for huge changes
    function walkAndDiff(baseNode, currNode) {
        if (!baseNode || !currNode) return;

        // Text nodes only!
        if (baseNode.nodeType === 3 && currNode.nodeType === 3) {
            // Do not process if text is exactly the same or if text is huge (which likely means we are in a hidden container)
            if (baseNode.textContent !== currNode.textContent && baseNode.textContent.length < 1000) {
                
                const parent = currNode.parentElement;
                // Safety: do NOT touch massive parent containers
                if (parent.tagName === 'BODY' || parent.tagName === 'HTML') return;

                const oldText = baseNode.textContent;
                const newText = currNode.textContent;

                const dmp = new diff_match_patch();
                const textDiffs = dmp.diff_main(oldText, newText);
                dmp.diff_cleanupSemantic(textDiffs);

                // Safe rebuild (innerHTML only on small leaf nodes like <p>, <td>, <li>)
                parent.innerHTML = ''; 

                textDiffs.forEach(part => {
                    const op = part[0]; 
                    const text = part[1];

                    if (op === 0) {
                        parent.appendChild(document.createTextNode(text));
                    } else if (op === 1) {
                        const span = document.createElement('span');
                        // INLINE STYLE, NO CSS FILE NEEDED
                        span.style.backgroundColor = '#a5f3a5'; 
                        span.style.color = '#155724';
                        span.textContent = text;
                        parent.appendChild(span);
                    } else if (op === -1) {
                        const span = document.createElement('span');
                        // INLINE STYLE, NO CSS FILE NEEDED
                        span.style.backgroundColor = '#f3a5a5'; 
                        span.style.color = '#721c24';
                        span.style.textDecoration = 'line-through';
                        span.textContent = text;
                        parent.appendChild(span);
                    }
                });
            }
        }

        // Recurse
        if (baseNode.childNodes && currNode.childNodes) {
            const len = Math.min(baseNode.childNodes.length, currNode.childNodes.length);
            for (let i = 0; i < len; i++) {
                walkAndDiff(baseNode.childNodes[i], currNode.childNodes[i]);
            }
        }
    }

    walkAndDiff(baseContent, mainContent);
    showToast('Visual Diff : ON', 'success');
}
