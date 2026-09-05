// 1. DYNAMIC SCRIPT LOADER
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

// 2. CLEAR HIGHLIGHTS (Safe DOM removal)
function clearHighlights() {
    document.querySelectorAll('.diff-span-add, .diff-span-del').forEach(el => {
        el.parentNode.replaceChild(document.createTextNode(el.textContent), el);
    });
    document.querySelectorAll('.diff-node-changed').forEach(el => {
        el.classList.remove('diff-node-changed');
    });
}

// 3. THE MAIN DIFF FUNCTION (Calls the loader first)
async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    // IMPORTANT: Load both libraries here, before using them!
    try {
        await loadScript('./diffDOM.js'); 
        await loadScript('./diff_match_patch.js'); 
    } catch (e) {
        console.error("Failed to load diff libraries:", e);
        showToast('Error: Diff libraries failed to load', 'error');
        return;
    }

    // Now the globals exist (window.DiffDOM, window.diff_match_patch)
    const parser = new DOMParser();
    const baseDoc = parser.parseFromString(baseHTML, 'text/html');

    const dd = new DiffDOM({
        valueDiffing: true,
        diffcap: 1000
    });

    const diffs = dd.diff(baseDoc, currentDoc);
    dd.apply(currentDoc.body, diffs);

    // Word-by-word highlighting (Structure Safe)
    diffs.forEach(diff => {
        if (diff.action === 'modifyTextElement') {
            const parentElement = diff.node.parentElement;
            parentElement.classList.add('diff-node-changed');

            let oldText = diff.oldValue;
            let newText = diff.newValue;

            const dmp = new diff_match_patch();
            const textDiffs = dmp.diff_main(oldText, newText);
            dmp.diff_cleanupSemantic(textDiffs);

            // CRITICAL: Rebuild text WITHOUT using innerHTML 
            // so we don't destroy table structures!
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
                    // Shows the red/removed text (what was in previous HTML)
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

// 4. IMPORTANT: Inject CSS only once when the script loads
if (!document.getElementById('diff-highlight-styles')) {
    const style = document.createElement('style');
    style.id = 'diff-highlight-styles';
    style.innerHTML = `
        .diff-span-add { background-color: #a5f3a5; color: #155724; text-decoration: none; border-radius: 2px; padding: 0 2px; }
        .diff-span-del { background-color: #f3a5a5; color: #721c24; text-decoration: line-through; border-radius: 2px; padding: 0 2px; }
    `;
    document.head.appendChild(style);
}