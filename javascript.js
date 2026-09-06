async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

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
            // If DiffDOM doesn't have a direct node reference, we have to find it.
            // Usually, diff.node is the text node, but we need its parent element.
            let targetElement = null;
            
            // Try to get the parent of the text node
            if (diff.node && diff.node.parentElement) {
                targetElement = diff.node.parentElement;
            } 
            // Fallback if diff.node is the element itself
            else if (diff.node) {
                targetElement = diff.node;
            }

            if (!targetElement) return;

            targetElement.classList.add('diff-node-changed');

            // Capture the text content BEFORE we wipe it
            let currentText = targetElement.textContent;
            let oldText = diff.oldValue || ''; 
            let newText = diff.newValue || '';

            // If text is missing, try to infer it from the DOM structure
            if (!oldText && !newText) {
                oldText = currentText;
                newText = diff.newValue;
            }

            const dmp = new diff_match_patch();
            const textDiffs = dmp.diff_main(oldText, newText);
            dmp.diff_cleanupSemantic(textDiffs);

            // SAFELY CLEAR THE ELEMENT
            // We use replaceChildren() which is much safer than innerHTML=""
            targetElement.replaceChildren(); 

            textDiffs.forEach(part => {
                const op = part[0]; 
                const text = part[1];

                if (op === 0) {
                    targetElement.appendChild(document.createTextNode(text));
                } else if (op === 1) {
                    const span = document.createElement('span');
                    span.className = 'diff-span-add';
                    span.textContent = text;
                    targetElement.appendChild(span);
                } else if (op === -1) {
                    const span = document.createElement('span');
                    span.className = 'diff-span-del';
                    span.textContent = text;
                    targetElement.appendChild(span);
                }
            });
        }
    });

    showToast('Visual Diff : ON', 'success');
}