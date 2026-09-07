async function applyDiff(baseHTML, currentDoc) {
    clearHighlights();

    let liveContent = getContentArea(currentDoc);
    if (!liveContent) return;

    liveContent.setAttribute('data-original-html', liveContent.innerHTML);

    function sanitizeSphinx(html) {
        return html
            .replace(/\s+id="id\d+"/gi, '') 
            .replace(/\s+class="[^"]*(?:row-odd|row-even)[^"]*"/gi, '');
    }

    let parser = new DOMParser();
    let baseDoc = parser.parseFromString(baseHTML, 'text/html');
    let baseContent = getContentArea(baseDoc);

    if (!baseContent) return;

    // THE FIX: Wrap both contents in identical dummy <div> tags.
    // This guarantees DiffDOM never complains about mismatched top-level node types.
    let oldContainer = document.createElement('div');
    oldContainer.innerHTML = sanitizeSphinx(baseContent.innerHTML);

    let newContainer = document.createElement('div');
    newContainer.innerHTML = sanitizeSphinx(liveContent.innerHTML);

    const dd = new window.DiffDOM({
        valueDiffing: true,
        preVirtualDiffApply: function(info) {
            if (info.diff.action === 'modifyTextElement') {
                const textNode = info.node;
                const parent = textNode.parentNode;
                if (!parent) return false;

                const oldText = info.diff.oldValue || '';
                const newText = info.diff.newValue || '';

                const dmp = new window.diff_match_patch();
                const textDiffs = dmp.diff_main(oldText, newText);
                dmp.diff_cleanupSemantic(textDiffs);

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

                parent.replaceChild(fragment, textNode);
                return true; 
            }
            return false; 
        }
    });

    // Diff the two identical containers
    const diffs = dd.diff(oldContainer, newContainer);
    dd.apply(oldContainer, diffs);

    // Extract the newly highlighted inner HTML and put it on the screen
    liveContent.innerHTML = oldContainer.innerHTML;

    console.log("Visual Diff applied successfully.");
    return 1;
}
