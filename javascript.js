function clearHighlights() {
    document.querySelectorAll('.diff-span-add, .diff-span-del').forEach(el => {
        el.parentNode.replaceChild(document.createTextNode(el.textContent), el);
    });
    document.querySelectorAll('.diff-changed-node').forEach(el => {
        el.classList.remove('diff-changed-node');
        el.style.backgroundColor = '';
        el.style.color = '';
        el.style.textDecoration = '';
    });
}

// 2. APPLY DIFF (Ultimate Robust Version)
async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    if (typeof DiffDOM === 'undefined' || typeof diff_match_patch === 'undefined') {
        console.error("Diff libs not loaded!");
        return;
    }

    const parser = new DOMParser();
    const baseDoc = parser.parseFromString(baseHTML, 'text/html');

    // Only target the main content area to ignore sidebars and headers
    const currentContent = currentDoc.querySelector('.rst-content') || currentDoc.body;
    const baseContent = baseDoc.querySelector('.rst-content') || baseDoc.body;

    // ==========================================
    // PHASE 1: STRUCTURAL CHANGES (DiffDOM)
    // Handles complex tables, moving rows, and adding headings.
    // ==========================================
    const dd = new DiffDOM({
        valueDiffing: true,
        diffcap: 1000
    });

    const structuralDiffs = dd.diff(baseContent, currentContent);
    dd.apply(currentContent, structuralDiffs);

    // ==========================================
    // PHASE 2: WORD-BY-WORD (DMP + Tracking Set)
    // Highlights ONLY the exact words that changed.
    // ==========================================
    const dmp = new diff_match_patch();
    
    // CRITICAL FIX: We track nodes we have already highlighted.
    // This stops the SAME text from being highlighted twice (Red, then Green).
    const processedNodes = new WeakSet();

    function walkAndDiff(baseNode, currNode) {
        if (!baseNode || !currNode) return;

        if (baseNode.nodeType === 3 && currNode.nodeType === 3) {
            const parent = currNode.parentElement;
            if (!parent) return;

            // EXCLUDE: Ignore massive wrappers, scripts, and styles
            if (parent.tagName === 'BODY' || parent.tagName === 'HTML' || 
                parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return;

            // ROBUST HEADING HANDLING:
            // 1. If it's a heading, we compare it directly.
            // 2. If it has NOT been processed yet, and the text changed, highlight it.
            if (baseNode.textContent !== currNode.textContent && !processedNodes.has(currNode)) {
                
                // Mark this node as processed so we never hit it again
                processedNodes.add(currNode);

                const oldText = baseNode.textContent;
                const newText = currNode.textContent;

                const textDiffs = dmp.diff_main(oldText, newText);
                dmp.diff_cleanupSemantic(textDiffs);

                // Use DocumentFragment for safe replacement
                const fragment = document.createDocumentFragment();

                textDiffs.forEach(part => {
                    const op = part[0]; 
                    const text = part[1];

                    if (op === 0) {
                        fragment.appendChild(document.createTextNode(text));
                    } else if (op === 1) {
                        const span = document.createElement('span');
                        span.className = 'diff-span-add';
                        span.style.backgroundColor = '#a5f3a5'; 
                        span.style.color = '#155724';
                        span.textContent = text;
                        fragment.appendChild(span);
                    } else if (op === -1) {
                        const span = document.createElement('span');
                        span.className = 'diff-span-del';
                        span.style.backgroundColor = '#f3a5a5'; 
                        span.style.color = '#721c24';
                        span.style.textDecoration = 'line-through';
                        span.textContent = text;
                        fragment.appendChild(span);
                    }
                });

                // Replace ONLY the text node with our fragment (never touches structure)
                currNode.parentNode.replaceChild(fragment, currNode);
            }
            return;
        }

        // Recurse into children
        if (baseNode.childNodes && currNode.childNodes) {
            const len = Math.min(baseNode.childNodes.length, currNode.childNodes.length);
            for (let i = 0; i < len; i++) {
                walkAndDiff(baseNode.childNodes[i], currNode.childNodes[i]);
            }
        }
    }

    walkAndDiff(baseContent, currentContent);
    showToast('Visual Diff : ON', 'success');
}
