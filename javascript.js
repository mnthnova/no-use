document.addEventListener("DOMContentLoaded", function() {
    // 1. DYNAMIC URL PARSING
    var url = window.location.href;
    var langMatch = url.match(/(\/mixed\/|\/en\/|\/ja\/)/);
    var currentLang = langMatch ? langMatch[1].replace(/\//g, '') : 'mixed';
    
    var splitIndex = langMatch ? url.indexOf('/' + currentLang + '/') : -1;
    var basePath = splitIndex !== -1 ? url.substring(0, splitIndex) : '';
    var pagePath = splitIndex !== -1 ? url.substring(splitIndex + currentLang.length + 2) : 'index.html';

    // Extract current branch/version name from URL (assumes .../ <version> / <lang> /...)
    var pathParts = basePath.split('/');
    var currentVersion = pathParts[pathParts.length - 1] || 'main';
    var rootBaseUrl = pathParts.slice(0, -1).join('/');

    // Available Versions (You can also populate this dynamically from your versions.json)
    var availableVersions = ['main', 'v1.0', 'v1.1']; 

    var langs = [
        { id: 'mixed', label: 'Original (Mixed)', short: 'Mixed' },
        { id: 'en', label: 'English', short: 'English' },
        { id: 'ja', label: '日本語 (Japanese)', short: 'Japanese' }
    ];

    // Save original HTML content so the Diff Toggle can cleanly turn OFF
    var contentArea = document.querySelector('[role="main"]') || document.querySelector('.wy-nav-content');
    var originalHTML = contentArea ? contentArea.innerHTML : '';
    var isDiffActive = false;

    // 2. INJECT PROFESSIONAL CSS
    var style = document.createElement('style');
    style.innerHTML = `
        .custom-rt-menu { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        
        /* Main Floating Pill Button */
        .rt-btn { background: #1f2428; color: #fff; padding: 10px 18px; border-radius: 30px; box-shadow: 0 4px 14px rgba(0,0,0,0.25); cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; border: 1px solid #3b434b; transition: all 0.2s; user-select: none; }
        .rt-btn:hover { background: #2f363d; transform: translateY(-1px); }
        .rt-badge { background: #2ea44f; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 11px; }

        /* Expanding Popup Panel */
        .rt-panel { display: none; position: absolute; bottom: calc(100% + 12px); right: 0; background: #24292e; color: #e1e4e8; border: 1px solid #444d56; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); width: 320px; overflow: hidden; flex-direction: column; }
        .rt-panel.open { display: flex; }

        /* Sections */
        .rt-section { padding: 12px 16px; border-bottom: 1px solid #373e47; }
        .rt-section:last-child { border-bottom: none; }
        .rt-title { font-size: 11px; font-weight: 700; color: #8b949e; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }

        /* Horizontal Grid for Languages & PDFs (RTD Flyout Style) */
        .rt-grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .rt-chip { background: #2f363d; color: #c9d1d9; padding: 6px 10px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500; border: 1px solid #444d56; transition: all 0.15s; display: inline-flex; align-items: center; gap: 5px; }
        .rt-chip:hover { background: #3b434b; color: #fff; border-color: #8b949e; }
        .rt-chip.active { background: #0366d6; color: #fff; border-color: #0366d6; font-weight: 600; }

        /* Version & Diff Controls */
        .rt-control-row { display: flex; gap: 8px; align-items: center; }
        .rt-select { flex: 1; background: #1b1f23; color: #e1e4e8; border: 1px solid #444d56; border-radius: 6px; padding: 6px 10px; font-size: 12px; outline: none; cursor: pointer; }
        .rt-select:focus { border-color: #0366d6; }

        /* Compare Toggle Button */
        .rt-compare-btn { background: #2f363d; color: #e1e4e8; border: 1px solid #444d56; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
        .rt-compare-btn:hover { background: #3b434b; border-color: #8b949e; }
        .rt-compare-btn.active { background: #2ea44f; color: #fff; border-color: #2ea44f; }
    `;
    document.head.appendChild(style);

    // 3. BUILD DOM STRUCTURE
    var container = document.createElement('div');
    container.className = 'custom-rt-menu';

    var panel = document.createElement('div');
    panel.className = 'rt-panel';

    // --- SECTION 1: LANGUAGES (Horizontal Pills) ---
    var langSection = document.createElement('div');
    langSection.className = 'rt-section';
    langSection.innerHTML = '<div class="rt-title"><span><i class="fa fa-globe"></i> Languages</span></div>';
    var langGrid = document.createElement('div');
    langGrid.className = 'rt-grid';

    langs.forEach(function(l) {
        var a = document.createElement('a');
        a.className = 'rt-chip' + (currentLang === l.id ? ' active' : '');
        a.innerHTML = l.label;
        a.href = (splitIndex !== -1) ? basePath + '/' + l.id + '/' + pagePath : '#';
        langGrid.appendChild(a);
    });
    langSection.appendChild(langGrid);

    // --- SECTION 2: DOWNLOADS (Horizontal Pills) ---
    var pdfSection = document.createElement('div');
    pdfSection.className = 'rt-section';
    pdfSection.innerHTML = '<div class="rt-title"><span><i class="fa fa-download"></i> Downloads</span></div>';
    var pdfGrid = document.createElement('div');
    pdfGrid.className = 'rt-grid';

    langs.forEach(function(l) {
        var a = document.createElement('a');
        a.className = 'rt-chip';
        a.innerHTML = '<i class="fa fa-file-pdf-o" style="color:#ff7b72;"></i> PDF (' + l.short + ')';
        a.href = basePath + '/pdf/' + l.id + '.pdf';
        a.target = '_blank';
        pdfGrid.appendChild(a);
    });
    pdfSection.appendChild(pdfGrid);

    // --- SECTION 3: SWITCH VERSION (Visit) ---
    var visitSection = document.createElement('div');
    visitSection.className = 'rt-section';
    visitSection.innerHTML = '<div class="rt-title"><span><i class="fa fa-code-fork"></i> Visit Version</span></div>';
    
    var visitRow = document.createElement('div');
    visitRow.className = 'rt-control-row';
    var visitSelect = document.createElement('select');
    visitSelect.className = 'rt-select';

    availableVersions.forEach(function(ver) {
        var opt = document.createElement('option');
        opt.value = ver;
        opt.textContent = ver + (ver === currentVersion ? ' (Current)' : '');
        if (ver === currentVersion) opt.selected = true;
        visitSelect.appendChild(opt);
    });

    // Automatically navigate to the selected version while keeping the same language & page
    visitSelect.onchange = function() {
        var targetVer = this.value;
        window.location.href = rootBaseUrl + '/' + targetVer + '/' + currentLang + '/' + pagePath;
    };
    visitRow.appendChild(visitSelect);
    visitSection.appendChild(visitRow);

    // --- SECTION 4: COMPARE VERSION (Diff Toggle) ---
    var diffSection = document.createElement('div');
    diffSection.className = 'rt-section';
    diffSection.innerHTML = '<div class="rt-title"><span><i class="fa fa-exchange"></i> Compare Changes</span></div>';

    var diffRow = document.createElement('div');
    diffRow.className = 'rt-control-row';

    var diffSelect = document.createElement('select');
    diffSelect.className = 'rt-select';
    availableVersions.forEach(function(ver) {
        if (ver !== currentVersion) {
            var opt = document.createElement('option');
            opt.value = ver;
            opt.textContent = 'vs ' + ver;
            diffSelect.appendChild(opt);
        }
    });

    var compareBtn = document.createElement('button');
    compareBtn.className = 'rt-compare-btn';
    compareBtn.innerHTML = '<i class="fa fa-eye"></i> Compare: OFF';

    // Toggle Diff ON / OFF
    compareBtn.onclick = function() {
        isDiffActive = !isDiffActive;
        var compareTargetVer = diffSelect.value;

        if (isDiffActive) {
            compareBtn.className = 'rt-compare-btn active';
            compareBtn.innerHTML = '<i class="fa fa-check"></i> Compare: ON';
            
            // Construct the exact language-matched URL for the target version
            var targetDiffUrl = rootBaseUrl + '/' + compareTargetVer + '/' + currentLang + '/' + pagePath;
            console.log("Running diff against:", targetDiffUrl);
            
            // ---> CALL YOUR EXISTING DIFF LOGIC FUNCTION HERE <---
            // Example: runCustomDiff(targetDiffUrl);
            if (typeof window.runCustomDiff === 'function') {
                window.runCustomDiff(targetDiffUrl);
            }
        } else {
            compareBtn.className = 'rt-compare-btn';
            compareBtn.innerHTML = '<i class="fa fa-eye"></i> Compare: OFF';
            
            // Restore original clean HTML when toggled OFF
            if (contentArea && originalHTML) {
                contentArea.innerHTML = originalHTML;
            }
        }
    };

    diffRow.appendChild(diffSelect);
    diffRow.appendChild(compareBtn);
    diffSection.appendChild(diffRow);

    // 4. ASSEMBLE PANEL & BUTTON
    panel.appendChild(langSection);
    panel.appendChild(pdfSection);
    panel.appendChild(visitSection);
    panel.appendChild(diffSection);

    var displayLang = langs.find(l => l.id === currentLang).short;
    var btn = document.createElement('div');
    btn.className = 'rt-btn';
    btn.innerHTML = '<i class="fa fa-book"></i> <span>' + currentVersion + '</span> <span class="rt-badge">' + displayLang + '</span> <i class="fa fa-caret-up"></i>';

    // Toggle menu open/close on click so dropdowns don't accidentally close the panel
    btn.onclick = function(e) {
        e.stopPropagation();
        panel.classList.toggle('open');
    };
    panel.onclick = function(e) {
        e.stopPropagation(); // Keep open while interacting with dropdowns inside
    };
    document.addEventListener('click', function() {
        panel.classList.remove('open');
    });

    container.appendChild(panel);
    container.appendChild(btn);
    document.body.appendChild(container);
});
