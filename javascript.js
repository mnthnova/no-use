function clearHighlights() {
    const spans = document.querySelectorAll('.diff-add, .diff-del');
    spans.forEach(span => {
        const parent = span.parentNode;
        // Replace the span with its text content
        parent.replaceChild(document.createTextNode(span.textContent), span);
        parent.normalize(); // Merge adjacent text nodes
    });
}

// 2. APPLY DIFF (Pure text node matching, NO innerHTML, NO massive rebuilding)
async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    if (typeof diff_match_patch === 'undefined') {
        console.error("diff_match_patch not found");
        return;
    }

    const parser = new DOMParser();
    const baseDoc = parser.parseFromString(baseHTML, 'text/html');

    // ONLY look inside the main content area to avoid touching the sidebar
    const baseContent = baseDoc.querySelector('.rst-content') || baseDoc.body;
    const currentContent = currentDoc.querySelector('.rst-content') || currentDoc.body;

    const dmp = new diff_match_patch();

    // Recursive walker that ONLY changes text nodes
    function walkAndDiff(baseNode, currNode) {
        if (!baseNode || !currNode) return;

        // If both are text nodes and they differ
        if (baseNode.nodeType === 3 && currNode.nodeType === 3) {
            if (baseNode.textContent !== currNode.textContent) {
                const parent = currNode.parentElement;
                
                // SAFETY: Do not touch massive parent containers or header/footer
                if (!parent || parent.tagName === 'BODY' || parent.tagName === 'HTML') return;

                const oldText = baseNode.textContent;
                const newText = currNode.textContent;

                const textDiffs = dmp.diff_main(oldText, newText);
                dmp.diff_cleanupSemantic(textDiffs);

                // Build a fragment to hold the new spans
                const fragment = document.createDocumentFragment();

                textDiffs.forEach(part => {
                    const op = part[0]; 
                    const text = part[1];

                    if (op === 0) {
                        fragment.appendChild(document.createTextNode(text));
                    } else if (op === 1) {
                        const span = document.createElement('span');
                        span.className = 'diff-add';
                        span.style.backgroundColor = '#a5f3a5'; // Green - Inline CSS
                        span.style.color = '#155724';
                        span.textContent = text;
                        fragment.appendChild(span);
                    } else if (op === -1) {
                        const span = document.createElement('span');
                        span.className = 'diff-del';
                        span.style.backgroundColor = '#f3a5a5'; // Red - Inline CSS
                        span.style.color = '#721c24';
                        span.style.textDecoration = 'line-through';
                        span.textContent = text;
                        fragment.appendChild(span);
                    }
                });

                // Replace the current text node with the fragment
                parent.replaceChild(fragment, currNode);
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
