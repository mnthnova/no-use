// 1. CLEAR HIGHLIGHTS (Safe Removal)
function clearHighlights() {
    // Replace our spans with their text content to restore the DOM exactly
    document.querySelectorAll('.diff-span-add, .diff-span-del').forEach(el => {
        el.parentNode.replaceChild(document.createTextNode(el.textContent), el);
    });
    // Reset any background colors
    document.querySelectorAll('.diff-node-changed').forEach(el => {
        el.classList.remove('diff-node-changed');
        el.style.backgroundColor = '';
    });
}

// 2. APPLY DIFF (Using ONLY diff_match_patch, NOT DiffDOM)
async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    // Check if the library is loaded
    if (typeof diff_match_patch === 'undefined') {
        console.error("diff_match_patch not loaded");
        return;
    }

    const parser = new DOMParser();
    const baseDoc = parser.parseFromString(baseHTML, 'text/html');

    // Walk both DOM trees and find text differences
    function walkAndDiff(baseNode, currNode) {
        if (!baseNode || !currNode) return;

        // If it's a text node (text inside a <td>, <p>, etc.)
        if (baseNode.nodeType === 3 && currNode.nodeType === 3) {
            if (baseNode.textContent !== currNode.textContent) {
                // Wrap the current text node with highlights
                const parent = currNode.parentElement;
                const oldText = baseNode.textContent;
                const newText = currNode.textContent;

                const dmp = new diff_match_patch();
                const textDiffs = dmp.diff_main(oldText, newText);
                dmp.diff_cleanupSemantic(textDiffs);

                // SAFELY CLEAR AND REBUILD
                // Use replaceChildren() to avoid wiping the whole parent HTML
                parent.replaceChildren(); 

                textDiffs.forEach(part => {
                    const op = part[0]; 
                    const text = part[1];

                    if (op === 0) {
                        parent.appendChild(document.createTextNode(text));
                    } else if (op === 1) {
                        const span = document.createElement('span');
                        span.className = 'diff-span-add'; // Green
                        span.textContent = text;
                        parent.appendChild(span);
                    } else if (op === -1) {
                        const span = document.createElement('span');
                        span.className = 'diff-span-del'; // Red
                        span.textContent = text;
                        parent.appendChild(span);
                    }
                });
            }
        }

        // Recurse into children safely
        if (baseNode.childNodes && currNode.childNodes) {
            const len = Math.min(baseNode.childNodes.length, currNode.childNodes.length);
            for (let i = 0; i < len; i++) {
                walkAndDiff(baseNode.childNodes[i], currNode.childNodes[i]);
            }
        }
    }

    walkAndDiff(baseDoc.body, currentDoc.body);

    showToast('Visual Diff : ON', 'success');
}


.diff-span-add {
    background-color: #a5f3a5; /* Green */
    color: #155724;
    text-decoration: none;
    border-radius: 2px;
    padding: 0 2px;
}

.diff-span-del {
    background-color: #f3a5a5; /* Red */
    color: #721c24;
    text-decoration: line-through;
    border-radius: 2px;
    padding: 0 2px;
}
