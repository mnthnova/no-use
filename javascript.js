// --- PASTE THE ENTIRE diffDOM.js CODE HERE ---
// (All the code from that file)
// ... 

// --- PASTE THE ENTIRE diff_match_patch.js CODE HERE ---
// (All the code from that file)
// ...


// --- YOUR ORIGINAL visual-diff.js CODE STARTS HERE ---
(function() {
    'use strict';

    // 1. CLEAR HIGHLIGHTS (DOM Safe)
    function clearHighlights() {
        document.querySelectorAll('.diff-span-add, .diff-span-del').forEach(el => {
            el.parentNode.replaceChild(document.createTextNode(el.textContent), el);
        });
        document.querySelectorAll('.diff-node-changed').forEach(el => {
            el.classList.remove('diff-node-changed');
        });
    }

    // 2. APPLY DIFF (No loadScript, No window.location.pathname - just direct usage)
    async function applyDiff(baseHTML, currentDoc) {
        clearHighlights();

        // Check if the globals exist (they will, since you pasted them)
        if (typeof DiffDOM === 'undefined' || typeof diff_match_patch === 'undefined') {
            console.error("Diff libs not found inside visual-diff.js");
            showToast('Error: Libs not inlined', 'error');
            return;
        }

        const parser = new DOMParser();
        const baseDoc = parser.parseFromString(baseHTML, 'text/html');

        const dd = new DiffDOM({
            valueDiffing: true,
            diffcap: 1000
        });

        const diffs = dd.diff(baseDoc, currentDoc);
        dd.apply(currentDoc.body, diffs);

        // Word-by-word highlighting
        diffs.forEach(diff => {
            if (diff.action === 'modifyTextElement') {
                const parentElement = diff.node.parentElement;
                parentElement.classList.add('diff-node-changed');

                let oldText = diff.oldValue;
                let newText = diff.newValue;

                const dmp = new diff_match_patch();
                const textDiffs = dmp.diff_main(oldText, newText);
                dmp.diff_cleanupSemantic(textDiffs);

                parentElement.innerHTML = ''; 

                textDiffs.forEach(part => {
                    const op = part[0]; 
                    const text = part[1];

                    if (op === 0) {
                        parentElement.appendChild(document.createTextNode(text));
                    } else if (op === 1) {
                        const span = document.createElement('span');
                        span.className = 'diff-span-add';
                        span.textContent = text;
                        parentElement.appendChild(span);
                    } else if (op === -1) {
                        const span = document.createElement('span');
                        span.className = 'diff-span-del';
                        span.textContent = text;
                        parentElement.appendChild(span);
                    }
                });
            }
        });

        showToast('Visual Diff : ON', 'success');
    }
    
    // ... Rest of your code ...
})();