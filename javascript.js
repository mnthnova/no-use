async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    // 1. Parse the base HTML into a DOM tree
    const parser = new DOMParser();
    const baseDoc = parser.parseFromString(baseHTML, 'text/html');
    
    // 2. Create the DMP instance
    const dmp = new diff_match_patch();

    // 3. Walk both DOM trees and compare ALL text nodes
    function walkAndDiff(baseNode, currNode) {
        if (!baseNode || !currNode) return;

        // If it's a text node (text inside a <td>, <p>, etc.)
        if (baseNode.nodeType === 3 && currNode.nodeType === 3) {
            if (baseNode.textContent !== currNode.textContent) {
                // Wrap the current text node with highlights
                const parent = currNode.parentElement;
                const oldText = baseNode.textContent;
                const newText = currNode.textContent;

                const textDiffs = dmp.diff_main(oldText, newText);
                dmp.diff_cleanupSemantic(textDiffs);

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
        }

        // Recurse into children
        if (baseNode.childNodes && currNode.childNodes) {
            const len = Math.min(baseNode.childNodes.length, currNode.childNodes.length);
            for (let i = 0; i < len; i++) {
                walkAndDiff(baseNode.childNodes[i], currNode.childNodes[i]);
            }
        }
    }

    // 4. Run the walker on the document body
    walkAndDiff(baseDoc.body, currentDoc.body);

    showToast('Visual Diff : ON', 'success');
}
