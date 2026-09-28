    async function injectDiffControls() {
        if (document.getElementById('diff-settings-panel')) return;

        // Grab your existing Versions dropdown in the sidebar
        const versionSelect = document.getElementById('version-select');

        let panel = document.createElement('div');
        panel.id = 'diff-settings-panel';

        // Inject clean, unified CSS for both sidebar dropdowns and the toggle button
        const style = document.createElement('style');
        style.textContent = `
            #version-select, #compare-branch-select {
                width: 100% !important;
                padding: 7px 10px !important;
                font-size: 12.5px !important;
                font-weight: 500 !important;
                color: #24292e !important;
                background-color: #ffffff !important;
                border: 1px solid #d1d5da !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                outline: none !important;
                box-sizing: border-box !important;
                transition: border-color 0.2s, box-shadow 0.2s !important;
                margin-top: 4px !important;
            }
            #version-select:focus, #compare-branch-select:focus {
                border-color: #0366d6 !important;
                box-shadow: 0 0 0 2px rgba(3, 102, 214, 0.25) !important;
            }
            #diff-settings-panel {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid rgba(255, 255, 255, 0.15);
                display: flex;
                flex-direction: column;
                gap: 8px;
                width: 100%;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .diff-sidebar-label {
                font-size: 11px;
                font-weight: 700;
                color: #c9d1d9;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                text-align: left;
            }
            #diff-toggle-btn {
                margin-top: 2px;
                width: 100%;
                padding: 8px 12px;
                font-size: 12.5px;
                font-weight: 600;
                color: #ffffff;
                background-color: #0366d6;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all 0.2s ease;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            }
            #diff-toggle-btn:hover:not(:disabled) {
                background-color: #0255b3;
            }
            #diff-toggle-btn.diff-active {
                background-color: #2ea44f;
            }
            #diff-toggle-btn.diff-active:hover {
                background-color: #268c43;
            }
            #diff-toggle-btn:disabled {
                background-color: #484f58;
                color: #8b949e;
                cursor: not-allowed;
                box-shadow: none;
            }
            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #ffffff;
                display: inline-block;
            }
        `;
        document.head.appendChild(style);

        // Polish the existing "Versions" heading in versioning.html so both labels match
        if (versionSelect && versionSelect.previousElementSibling) {
            versionSelect.previousElementSibling.className = 'diff-sidebar-label';
            versionSelect.previousElementSibling.style.margin = '0 0 2px 0';
        }

        // 1. "Compare against:" Label
        let label = document.createElement('div');
        label.className = 'diff-sidebar-label';
        label.textContent = "Compare against";
        panel.appendChild(label);

        // 2. The Target Branch Dropdown
        let branchSelect = document.createElement('select');
        branchSelect.id = 'compare-branch-select';

        // 3. The Toggle Diff Button
        let toggleBtn = document.createElement('button');
        toggleBtn.id = 'diff-toggle-btn';

        function updateToggleBtnUI() {
            if (!targetBranch || targetBranch === currentBranch) {
                toggleBtn.disabled = true;
                toggleBtn.classList.remove('diff-active');
                toggleBtn.innerHTML = `Same Version Selected`;
            } else if (diffActive) {
                toggleBtn.disabled = false;
                toggleBtn.classList.add('diff-active');
                toggleBtn.innerHTML = `<span class="status-dot"></span> Diff Active (ON) — Hide`;
            } else {
                toggleBtn.disabled = false;
                toggleBtn.classList.remove('diff-active');
                toggleBtn.innerHTML = `Compare Diff`;
            }
        }

        // Fetch and Sort the JSON
        try {
            let basePath = window.location.pathname.split(`/${currentBranch}/current/`)[0];
            let response = await fetch(`${basePath}/versions.json`);
            if (response.ok) {
                let versions = await response.json();

                let branchGroup = document.createElement('optgroup');
                branchGroup.label = "── Branches ──";

                let tagGroup = document.createElement('optgroup');
                tagGroup.label = "── Tags (Releases) ──";

                versions.forEach(v => {
                    let opt = document.createElement('option');
                    opt.value = v.name;
                    opt.textContent = v.name === currentBranch ? `${v.name} (current)` : v.name;
                    opt.setAttribute('data-type', v.type);

                    // Prevent selecting the current branch to compare against itself
                    if (v.name === currentBranch) {
                        opt.disabled = true;
                    }

                    if (v.type === 'tag') {
                        tagGroup.appendChild(opt);
                    } else {
                        branchGroup.appendChild(opt);
                    }
                });

                branchSelect.appendChild(branchGroup);
                branchSelect.appendChild(tagGroup);

                // SMART DEFAULT SELECTION:
                // Try to default the compare target to 'main' (if we aren't already on main)
                // Otherwise, pick the first available option that isn't the current branch.
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
            branchSelect.innerHTML = `<option value="main">main</option>`;
            targetBranch = "main";
        }

        updateToggleBtnUI();

        // --- EVENT LISTENERS ---
        // 1. Dropdown change listener
        branchSelect.addEventListener('change', function(e) {
            targetBranch = e.target.value;
            previousHTML = null; // Clear cache so it fetches the newly selected branch

            if (targetBranch === currentBranch) {
                if (diffActive) toggleDiff();
                updateToggleBtnUI();
                return;
            }

            if (diffActive) {
                toggleDiff(); // Re-run diff with newly selected branch
            }
            updateToggleBtnUI();
        });

        // 2. Toggle Button click listener
        toggleBtn.addEventListener('click', function() {
            if (!targetBranch || targetBranch === currentBranch) return;
            toggleDiff();
            updateToggleBtnUI();
        });

        // 3. Keep button UI in sync if user still presses 'd' on keyboard
        document.addEventListener('keydown', function(e) {
            if (e.key === 'd' || e.key === 'D') {
                setTimeout(updateToggleBtnUI, 50);
            }
        });

        panel.appendChild(branchSelect);
        panel.appendChild(toggleBtn);

        // Mount directly below the Versions dropdown in the sidebar (fallback to body if missing)
        if (versionSelect && versionSelect.parentNode) {
            versionSelect.insertAdjacentElement('afterend', panel);
        } else {
            document.body.appendChild(panel);
        }
    }
