    // Dynamically detect currentBranch and folder (works with /current/, /mixed/, /en/, or /ja/)
    let pathMatch = window.location.pathname.match(/\/([^\/]+)\/(current|mixed|en|ja)\//);
    let currentBranch = pathMatch ? pathMatch[1] : "main";
    let currentLangFolder = pathMatch ? pathMatch[2] : "current";
    let targetBranch = ""; // Will be dynamically set

    async function injectDiffControls() {
        if (document.getElementById('diff-settings-panel')) return;

        let panel = document.createElement('div');
        panel.id = 'diff-settings-panel';

        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #ffffff;
            padding: 12px 14px;
            border: 1px solid #e1e4e8;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(27,31,35,0.15);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 210px;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        `;

        const labelStyle = "font-size: 11px; font-weight: 700; color: #586069; margin-left: 2px; text-transform: uppercase; letter-spacing: 0.3px;";
        const selectStyle = `
            background-color: #f6f8fa;
            border: 1px solid #e1e4e8;
            border-radius: 6px;
            padding: 6px 8px;
            font-size: 13px;
            font-weight: 500;
            color: #24292e;
            cursor: pointer;
            outline: none;
            width: 100%;
            box-sizing: border-box;
            transition: all 0.2s ease;
        `;

        // --- 1. VISIT VERSION DROPDOWN ---
        let visitLabel = document.createElement('div');
        visitLabel.textContent = "Visit Version:";
        visitLabel.style.cssText = labelStyle;
        panel.appendChild(visitLabel);

        let visitSelect = document.createElement('select');
        visitSelect.style.cssText = selectStyle;
        panel.appendChild(visitSelect);

        // Divider line between Visit and Compare
        let divider = document.createElement('div');
        divider.style.cssText = "border-top: 1px solid #eaecef; margin: 2px 0;";
        panel.appendChild(divider);

        // --- 2. COMPARE AGAINST DROPDOWN ---
        let compareLabel = document.createElement('div');
        compareLabel.textContent = "Compare against:";
        compareLabel.style.cssText = labelStyle;
        panel.appendChild(compareLabel);

        let branchSelect = document.createElement('select');
        branchSelect.style.cssText = selectStyle;

        // --- 3. COMPARE TOGGLE BUTTON ---
        let compareBtn = document.createElement('button');
        compareBtn.id = 'diff-toggle-btn';
        compareBtn.textContent = "Compare";
        compareBtn.style.cssText = `
            background-color: #0366d6;
            color: #ffffff;
            border: 1px solid #0366d6;
            border-radius: 6px;
            padding: 7px 10px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: all 0.2s ease;
        `;

        function syncButtonUI() {
            if (!targetBranch || targetBranch === currentBranch) {
                compareBtn.disabled = true;
                compareBtn.textContent = "Same Version";
                compareBtn.style.backgroundColor = "#eaecef";
                compareBtn.style.borderColor = "#d1d5da";
                compareBtn.style.color = "#959da5";
                compareBtn.style.cursor = "not-allowed";
            } else if (diffActive) {
                compareBtn.disabled = false;
                compareBtn.textContent = "Comparing (ON) - Reset";
                compareBtn.style.backgroundColor = "#28a745";
                compareBtn.style.borderColor = "#28a745";
                compareBtn.style.color = "#ffffff";
                compareBtn.style.cursor = "pointer";
            } else {
                compareBtn.disabled = false;
                compareBtn.textContent = "Compare";
                compareBtn.style.backgroundColor = "#0366d6";
                compareBtn.style.borderColor = "#0366d6";
                compareBtn.style.color = "#ffffff";
                compareBtn.style.cursor = "pointer";
            }
        }

        // Fetch and Sort the JSON
        try {
            let basePath = window.location.pathname.split(`/${currentBranch}/${currentLangFolder}/`)[0];
            let response = await fetch(`${basePath}/versions.json`);
            if (response.ok) {
                let versions = await response.json();

                // Groups for Visit Dropdown
                let visitBranchGroup = document.createElement('optgroup');
                visitBranchGroup.label = "── Branches ──";
                let visitTagGroup = document.createElement('optgroup');
                visitTagGroup.label = "── Tags (Releases) ──";

                // Groups for Compare Dropdown
                let branchGroup = document.createElement('optgroup');
                branchGroup.label = "── Branches ──";
                let tagGroup = document.createElement('optgroup');
                tagGroup.label = "── Tags (Releases) ──";

                versions.forEach(v => {
                    // 1. Populate Visit Dropdown
                    let vOpt = document.createElement('option');
                    vOpt.value = v.name;
                    vOpt.textContent = v.name === currentBranch ? `${v.name} (current)` : v.name;
                    if (v.name === currentBranch) vOpt.selected = true;
                    if (v.type === 'tag') visitTagGroup.appendChild(vOpt);
                    else visitBranchGroup.appendChild(vOpt);

                    // 2. Populate Compare Dropdown (Disable currentBranch so user can't compare same branch)
                    let cOpt = document.createElement('option');
                    cOpt.value = v.name;
                    cOpt.textContent = v.name === currentBranch ? `${v.name} (current)` : v.name;
                    cOpt.setAttribute('data-type', v.type);
                    if (v.name === currentBranch) {
                        cOpt.disabled = true;
                    }
                    if (v.type === 'tag') tagGroup.appendChild(cOpt);
                    else branchGroup.appendChild(cOpt);
                });

                visitSelect.appendChild(visitBranchGroup);
                visitSelect.appendChild(visitTagGroup);

                branchSelect.appendChild(branchGroup);
                branchSelect.appendChild(tagGroup);

                // SMART DEFAULT SELECTION (Pick 'main' or first option that isn't currentBranch)
                let selectedIndex = -1;
                for (let i = 0; i < branchSelect.options.length; i++) {
                    if (branchSelect.options[i].value === 'main' && currentBranch !== 'main') {
                        selectedIndex = i;
                        break;
                    } else if (branchSelect.options[i].value !== currentBranch && selectedIndex === -1) {
                        selectedIndex = i;
                    }
                }
                if (selectedIndex !== -1) {
                    branchSelect.selectedIndex = selectedIndex;
                    targetBranch = branchSelect.value;
                } else {
                    targetBranch = currentBranch;
                }
            }
        } catch (e) {
            visitSelect.innerHTML = `<option value="${currentBranch}">${currentBranch}</option>`;
            branchSelect.innerHTML = `<option value="main">main</option>`;
            targetBranch = "main";
        }

        syncButtonUI();

        // --- EVENT LISTENERS ---
        // 1. Visit Version change -> Navigate to selected version
        visitSelect.addEventListener('change', function(e) {
            let selectedVer = e.target.value;
            if (selectedVer && selectedVer !== currentBranch) {
                let searchStr = `/${currentBranch}/${currentLangFolder}/`;
                let replaceStr = `/${selectedVer}/${currentLangFolder}/`;
                window.location.pathname = window.location.pathname.replace(searchStr, replaceStr);
            }
        });

        // 2. Compare Against change -> Update targetBranch (and re-run diff if already active)
        branchSelect.addEventListener('change', function(e) {
            targetBranch = e.target.value;
            previousHTML = null; // Clear cache so it fetches the newly selected branch

            // Guard: Do not compare if same branch is somehow selected
            if (targetBranch === currentBranch) {
                if (diffActive) toggleDiff(); // Turn off diff if active
                syncButtonUI();
                return;
            }

            if (diffActive) {
                toggleDiff(); // Turn off old diff
                toggleDiff(); // Turn on new diff with new targetBranch
            }
            syncButtonUI();
        });

        // 3. Compare Toggle Button click -> Toggle ON/OFF
        compareBtn.addEventListener('click', function() {
            if (!targetBranch || targetBranch === currentBranch) return;
            toggleDiff();
            syncButtonUI();
        });

        panel.appendChild(branchSelect);
        panel.appendChild(compareBtn);
        document.body.appendChild(panel);
    }

    // Call it safely
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        injectDiffControls();
    } else {
        document.addEventListener('DOMContentLoaded', injectDiffControls);
    }

    // 2. THE SIMPLIFIED URL ROUTER (Works with /current/, /mixed/, /en/, or /ja/)
    function getPreviousURL() {
        let path = window.location.pathname;
        let searchString = `/${currentBranch}/${currentLangFolder}/`;
        let replaceString = `/${targetBranch}/${currentLangFolder}/`;
        return path.replace(searchString, replaceString);
    }
