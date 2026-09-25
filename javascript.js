// 1. CACHE ORIGINAL PAGE HTML (For instant Toggle OFF)
var contentContainer = document.querySelector('[role="main"], .rst-content, .document');
var cleanPageHTML = contentContainer ? contentContainer.innerHTML : '';
var isCompareActive = false;

// 2. COMPACT STACKED UI CSS (Visit Version + Compare Against right below it)
var diffPanelStyle = document.createElement('style');
diffPanelStyle.innerHTML = `
    .version-diff-card {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #ffffff;
        border: 1px solid #e1e4e8;
        border-radius: 10px;
        padding: 12px 14px;
        width: 250px;
        box-shadow: 0 6px 20px rgba(27, 31, 35, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .vd-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .vd-label {
        font-size: 11px;
        font-weight: 700;
        color: #586069;
        text-transform: uppercase;
        letter-spacing: 0.4px;
    }
    .vd-select {
        width: 100%;
        padding: 6px 8px;
        font-size: 12px;
        font-weight: 500;
        color: #24292e;
        background: #f6f8fa;
        border: 1px solid #d1d5da;
        border-radius: 6px;
        cursor: pointer;
        outline: none;
    }
    .vd-select:focus {
        border-color: #0366d6;
        background: #ffffff;
    }
    .vd-compare-controls {
        display: flex;
        gap: 6px;
        align-items: center;
    }
    .vd-toggle-btn {
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        border-radius: 6px;
        border: 1px solid #0366d6;
        background: #ffffff;
        color: #0366d6;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
    }
    .vd-toggle-btn:hover {
        background: #f1f8ff;
    }
    /* Active Toggle ON State */
    .vd-toggle-btn.active {
        background: #28a745;
        border-color: #28a745;
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(40, 167, 69, 0.3);
    }
`;
document.head.appendChild(diffPanelStyle);

// 3. BUILD THE CARD HTML
var card = document.createElement('div');
card.className = 'version-diff-card';
card.innerHTML = `
    <!-- Top: Visit Version -->
    <div class="vd-row">
        <span class="vd-label">Visit Version</span>
        <select id="visit-version-select" class="vd-select"></select>
    </div>

    <!-- Bottom (Right below): Compare Against + Toggle Button -->
    <div class="vd-row" style="border-top: 1px solid #eaecef; padding-top: 8px;">
        <span class="vd-label">Compare Against</span>
        <div class="vd-compare-controls">
            <select id="compare-version-select" class="vd-select"></select>
            <button id="compare-toggle-btn" class="vd-toggle-btn">Compare</button>
        </div>
    </div>
`;
document.body.appendChild(card);

// 4. TOGGLE BUTTON LOGIC
var toggleBtn = document.getElementById('compare-toggle-btn');
var compareSelect = document.getElementById('compare-version-select');

toggleBtn.addEventListener('click', function() {
    var targetBranch = compareSelect.value;
    if (!targetBranch) return;

    isCompareActive = !isCompareActive;

    if (isCompareActive) {
        // TOGGLE ON: Turn button green and trigger your existing diff function
        toggleBtn.classList.add('active');
        toggleBtn.innerText = 'Comparing (ON)';
        
        // Call your existing diff function here with targetBranch
        runYourDiffLogic(targetBranch);
    } else {
        // TOGGLE OFF: Restore original clean HTML immediately
        toggleBtn.classList.remove('active');
        toggleBtn.innerText = 'Compare';
        if (contentContainer) {
            contentContainer.innerHTML = cleanPageHTML;
        }
    }
});

// Auto-refresh diff if Toggle is already ON and user selects a different branch
compareSelect.addEventListener('change', function() {
    if (isCompareActive && this.value) {
        if (contentContainer) contentContainer.innerHTML = cleanPageHTML;
        runYourDiffLogic(this.value);
    }
});
