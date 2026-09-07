async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    let liveContent = getContentArea(currentDoc);
    if (!liveContent) return;

    // Save original state for your toggle button
    liveContent.setAttribute('data-original-html', liveContent.innerHTML);

    // 1. STRIP SPHINX NOISE
    // This removes the random IDs and changing row colors that cause the duplicate captions.
    function sanitizeSphinx(html) {
        return html
            .replace(/\s+id="id\d+"/gi, '') 
            .replace(/\s+class="[^"]*(?:row-odd|row-even)[^"]*"/gi, '');
    }

    let parser = new DOMParser();
    // Parse the older document
    let baseDoc = parser.parseFromString(sanitizeSphinx(baseHTML), 'text/html');
    let baseContent = getContentArea(baseDoc);
    
    // Parse the live document into a clean, detached DOM for comparison
    let currentDocTemp = parser.parseFromString(sanitizeSphinx(liveContent.innerHTML), 'text/html');
    let currentContentTarget = getContentArea(currentDocTemp);

    if (!baseContent || !currentContentTarget) return;

    // 2. THE HYBRID ENGINE (DiffDOM for layout + DMP for text)
    const dd = new window.DiffDOM({
        valueDiffing: true,
        preVirtualDiffApply: function(info) {
            // When DiffDOM detects a pure text change, we intercept it
            if (info.diff.action === 'modifyTextElement') {
                const textNode = info.node;
                const parent = textNode.parentNode;
                if (!parent) return false;

                const oldText = info.diff.oldValue || '';
                const newText = info.diff.newValue || '';

                // Run your exact word-by-word logic on the pure text
                const dmp = new window.diff_match_patch();
                const textDiffs = dmp.diff_main(oldText, newText);
                dmp.diff_cleanupSemantic(textDiffs);

                // Build a fragment to safely inject the spans without destroying the DOM
                const fragment = document.createDocumentFragment();
                textDiffs.forEach(part => {
                    const op = part[0];
                    const text = part[1];

                    if (op === 0) {
                        fragment.appendChild(document.createTextNode(text));
                    } else if (op === 1) {
                        const ins = document.createElement('ins');
                        ins.style.cssText = 'background: #d4fcbc; color: #155724; text-decoration: none; border-radius: 2px; padding: 1px 2px;';
                        ins.textContent = text;
                        fragment.appendChild(ins);
                    } else if (op === -1) {
                        const del = document.createElement('del');
                        del.style.cssText = 'background: #ffdce0; color: #b31d28; text-decoration: line-through; border-radius: 2px; padding: 1px 2px;';
                        del.textContent = text;
                        fragment.appendChild(del);
                    }
                });

                // Swap the old text node with our new highlighted spans safely
                parent.replaceChild(fragment, textNode);
                
                // Tell DiffDOM we handled this text, so it doesn't overwrite it
                return true; 
            }
            
            // Let DiffDOM natively handle all table structures (<tr>, <td>) so they never break
            return false; 
        }
    });

    // 3. APPLY AND RENDER
    // Calculate the structural differences
    const diffs = dd.diff(baseContent, currentContentTarget);
    
    // Apply the differences to the OLD document. 
    // This turns the old document into the new document while triggering our highlight hook along the way.
    dd.apply(baseContent, diffs);

    // Inject the perfectly highlighted HTML back onto your live screen
    liveContent.innerHTML = baseContent.innerHTML;

    console.log("Visual Diff applied successfully.");
    return 1;
}
