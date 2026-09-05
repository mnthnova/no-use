// 1. DYNAMIC SCRIPT LOADER (Using currentScript.src to find sibling files)
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // 1. Check if already loaded in DOM
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }

        // 2. Create script element
        const script = document.createElement('script');
        script.src = src;
        script.type = 'text/javascript'; // Force strict MIME type to be JS
        script.async = true;

        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        
        // 3. Append and start loading
        document.head.appendChild(script);
    });
}

// ... [Your clearHighlights function remains exactly the same] ...

// 2. THE MAIN DIFF FUNCTION
async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    // IMPORTANT: Determine the correct base path where THIS script is located
    let basePath = '';
    if (document.currentScript && document.currentScript.src) {
        // This gets the full URL of visual-diff.js
        let scriptUrl = document.currentScript.src; 
        // Remove the filename to get the folder path
        basePath = scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
    } else {
        // Fallback if currentScript is not available (e.g., old browsers)
        basePath = './';
    }

    // Load both libraries using the correct path
    try {
        // If visual-diff.js is in /_static/, it will load /_static/diffDOM.js
        await loadScript(basePath + 'diffDOM.js'); 
        await loadScript(basePath + 'diff_match_patch.js'); 
    } catch (e) {
        console.error("Failed to load diff libraries:", e);
        showToast('Error: Diff libraries failed to load. Check path', 'error');
        return;
    }

    // Verify globals exist
    if (typeof DiffDOM === 'undefined' || typeof diff_match_patch === 'undefined') {
        console.error("Libraries loaded but globals not defined!");
        showToast('Error: Library injection blocked by server', 'error');
        return;
    }

    // ... [Rest of your applyDiff logic - No changes needed] ...
    // The rest of your code...
    const parser = new DOMParser();
    const baseDoc = parser.parseFromString(baseHTML, 'text/html');

    const dd = new DiffDOM({
        valueDiffing: true,
        diffcap: 1000
    });

    const diffs = dd.diff(baseDoc, currentDoc);
    dd.apply(currentDoc.body, diffs);

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