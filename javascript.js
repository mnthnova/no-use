async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    const parser = new DOMParser();
    const baseDoc = parser.parseFromString(baseHTML, 'text/html');

    // 1. Initialize DiffDOM with a corrected preVirtualDiffApply hook
    const dd = new window.DiffDOM({
        valueDiffing: true,
        preVirtualDiffApply: (info) => {
            // Only intervene if the action is modifying a text element
            if (info.diff.action === 'modifyTextElement') {
                const parent = info.node && info.node.parentElement;
                
                // If there is no parent, let diffDOM handle it normally
                if (!parent) return false; 

                const oldText = info.diff.oldValue || '';
                const newText = info.diff.newValue || '';

                const dmp = new window.diff_match_patch();
                const textDiffs = dmp.diff_main(oldText, newText);
                dmp.diff_cleanupSemantic(textDiffs);

                // Rewrite the text with inline styles
                parent.innerHTML = '';
                textDiffs.forEach(part => {
                    const op = part[0];
                    const text = part[1];

                    if (op === 0) {
                        parent.appendChild(document.createTextNode(text));
                    } else if (op === 1) {
                        const span = document.createElement('span');
                        span.style.backgroundColor = '#a5f3a5'; // Green
                        span.textContent = text;
                        parent.appendChild(span);
                    } else if (op === -1) {
                        const span = document.createElement('span');
                        span.style.backgroundColor = '#f3a5a5'; // Red
                        span.style.textDecoration = 'line-through';
                        span.textContent = text;
                        parent.appendChild(span);
                    }
                });

                // IMPORTANT: Return true ONLY inside this block to tell diffDOM 
                // "I manually handled this specific text change, skip your default text swap."
                return true; 
            }
            
            // For all other structural changes (adding/removing rows, etc.), return false 
            // to let diffDOM do its job natively.
            return false;
        }
    });

    // 2. Compute and Apply Diffs
    const diffs = dd.diff(baseDoc.body, currentDoc.body);
    dd.apply(currentDoc.body, diffs);
    
    return 1;
}
