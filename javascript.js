async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    const parser = new DOMParser();
    const baseDoc = parser.parseFromString(baseHTML, 'text/html');

    // 1. Initialize DiffDOM with a preVirtualDiffApply hook
    const dd = new DiffDOM({
        valueDiffing: true,
        diffcap: 1000,
        preVirtualDiffApply: (info) => {
            // This runs BEFORE the DOM is changed!
            if (info.diff.action === 'modifyTextElement') {
                const parent = info.node && info.node.parentElement;
                if (!parent) return true;

                const oldText = info.diff.oldValue || '';
                const newText = info.diff.newValue || '';

                const dmp = new diff_match_patch();
                const textDiffs = dmp.diff_main(oldText, newText);
                dmp.diff_cleanupSemantic(textDiffs);

                // Rewrite the text with inline styles (no innerHTML, no CSS classes)
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
            }
            return true;
        }
    });

    // 2. Compute and Apply Diffs (The preVirtualDiffApply hook handles the highlighting)
    const diffs = dd.diff(baseDoc, currentDoc);
    dd.apply(currentDoc.body, diffs);

    // 3. Give a visual cue that it worked
    console.log("Diff applied successfully.");
    showToast('Visual Diff : ON', 'success');
}