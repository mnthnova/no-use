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

    // 1. Load diff_match_patch.js (independent library)
    const script1 = document.createElement('script');
    script1.src = basePath + 'diff_match_patch.js';
    script1.onload = () => {
        console.log("Local Diff Lib Loaded");
        
        // 2. THE NODE.JS EXPORTS FIX (Shim)
        // Must run BEFORE diffDOM.js
        const shim = document.createElement('script');
        shim.textContent = "var exports = {}; var module = { exports: {} };";
        document.head.appendChild(shim);
        
        // 3. Load diffDOM.js (structural library)
        const script2 = document.createElement('script');
        script2.src = basePath + 'diffDOM.js';
        script2.onload = () => console.log("Local DiffDOM Loaded");
        document.head.appendChild(script2);
    };
    document.head.appendChild(script1);
})();