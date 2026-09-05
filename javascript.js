(function loadLocalDiffLib() {
    if (window.diff_match_patch && window.DiffDOM) {
        console.log("diff lib already loaded");
        return;
    }

    // Determine the exact directory where THIS file lives
    let basePath = '';
    const scriptTag = document.querySelector('script[src*="visual-diff"]');
    if (scriptTag) {
        basePath = scriptTag.src.substring(0, scriptTag.src.lastIndexOf('/') + 1);
    }

    // 1. Load diff_match_patch.js using the exact directory
    const script1 = document.createElement('script');
    script1.src = basePath + 'diff_match_patch.js';
    script1.onload = () => {
        console.log("Local Diff Lib Loaded");
        
        // 2. Load diffDOM.js AFTER the first one succeeds
        const script2 = document.createElement('script');
        script2.src = basePath + 'diffDOM.js';
        script2.onload = () => console.log("Local DiffDOM Loaded");
        document.head.appendChild(script2);
    };
    document.head.appendChild(script1);
})();