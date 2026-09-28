    async function injectDiffControls() {
        if (document.getElementById('diff-settings-panel')) return;

        const versionSelect = document.getElementById('version-select');

        let panel = document.createElement('div');
        panel.id = 'diff-settings-panel';

        // Unified CSS for both Search Bars, Dropdowns, and Toggle Button
        const style = document.createElement('style');
        style.textContent = `
            .sidebar-search-input {
                width: 100% !important;
                padding: 5px 8px !important;
                margin-top: 4px !important;
                margin-bottom: 4px !important;
                font-size: 12px !important;
                color: #24292e !important;
                background-color: #f6f8fa !important;
                border: 1px solid #d1d5da !important;
                border-radius: 6px !important;
                box-sizing: border-box !important;
                outline: none !important;
                transition: border-color 0.2s, background-color 0.2s !important;
            }
            .sidebar-search-input:focus {
                background-color: #ffffff !important;
                border-color: #0366d6 !important;
                box-shadow: 0 0 0 2px rgba(3, 102, 214, 0.2) !important;
            }
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
                margin-top: 2px !important;
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
                gap: 6px;
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
                margin-top: 4px;
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

        // Helper function to wire a live search input to any <select> with <optgroup>s
        function attachSelectFilter(selectEl, searchInputEl, onFilterComplete) {
            let cachedStructure = null;

            function snapshotOptions() {
                if (cachedStructure && cachedStructure.some(g => g.options.length > 0)) return;
                cachedStructure = [];
                Array.from(selectEl.children).forEach(child => {
                    if (child.tagName === 'OPTGROUP') {
                        cachedStructure.push({
                            type: 'optgroup',
                            label: child.label,
                            options: Array.from(child.children).map(o => ({
                                value: o.value,
                                text: o.textContent,
                                disabled: o.disabled,
                                selected: o.selected,
                                dataType: o.getAttribute('data-type')
                            }))
                        });
                    } else if (child.tagName === 'OPTION') {
                        cachedStructure.push({
                            type: 'option',
                            value: child.value,
                            text: child.textContent,
                            disabled: child.disabled,
                            selected: child.selected,
                            dataType: child.getAttribute('data-type')
                        });
                    }
                });
            }

            searchInputEl.addEventListener('focus', snapshotOptions);
            searchInputEl.addEventListener('input', function() {
                snapshotOptions();
                const query = this.value.trim().toLowerCase();
                const previousValue = selectEl.value;
                selectEl.innerHTML = '';

                cachedStructure.forEach(item => {
                    if (item.type === 'optgroup') {
                        const matchingOpts = item.options.filter(o => o.text.toLowerCase().includes(query));
                        if (matchingOpts.length > 0) {
                            const group = document.createElement('optgroup');
                            group.label = item.label;
                            matchingOpts.forEach(o => {
                                const opt = document.createElement('option');
                                opt.value = o.value;
                                opt.textContent = o.text;
                                opt.disabled = o.disabled;
                                if (o.dataType) opt.setAttribute('data-type', o.dataType);
                                if (o.value === previousValue) opt.selected = true;
                                group.appendChild(opt);
                            });
                            selectEl.appendChild(group);
                        }
                    } else if (item.type === 'option') {
                        if (item.text.toLowerCase().includes(query)) {
                            const opt = document.createElement('option');
                            opt.value = item.value;
                            opt.textContent = item.text;
                            opt.disabled = item.disabled;
                            if (item.value === previousValue) opt.selected = true;
                            selectEl.appendChild(opt);
                        }
                    }
                });

                // If nothing matched, show a placeholder option
                if (selectEl.options.length === 0) {
                    const emptyOpt = document.createElement('option');
                    emptyOpt.value = "";
                    emptyOpt.textContent = "No matching branch/tag";
                    emptyOpt.disabled = true;
                    selectEl.appendChild(emptyOpt);
                } else if (selectEl.selectedIndex === -1 || selectEl.options[selectEl.selectedIndex].disabled) {
                    // Auto-pick first non-disabled option when filtering
                    for (let i = 0; i < selectEl.options.length; i++) {
                        if (!selectEl.options[i].disabled) {
                            selectEl.selectedIndex = i;
                            break;
                        }
                    }
                }

                if (onFilterComplete) onFilterComplete();
            });
        }

        // --- 1. ADD SEARCH BAR ABOVE EXISTING "VERSIONS" DROPDOWN ---
        if (versionSelect) {
            if (versionSelect.previousElementSibling) {
                versionSelect.previousElementSibling.className = 'diff-sidebar-label';
                versionSelect.previousElementSibling.style.margin = '0 0 2px 0';
            }
            let versionSearch = document.createElement('input');
            versionSearch.type = 'text';
            versionSearch.className = 'sidebar-search-input';
            versionSearch.placeholder = '🔍 Search versions...';
            versionSelect.insertAdjacentElement('beforebegin', versionSearch);

            // Filter Versions dropdown & allow pressing Enter to jump straight to filtered result
            attachSelectFilter(versionSelect, versionSearch);
            versionSearch.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && versionSelect.value) {
                    versionSelect.dispatchEvent(new Event('change'));
                }
            });
        }

        // --- 2. BUILD "COMPARE AGAINST" SECTION ---
        let label = document.createElement('div');
        label.className = 'diff-sidebar-label';
        label.textContent = "Compare against";
        panel.appendChild(label);

        let compareSearch = document.createElement('input');
        compareSearch.type = 'text';
        compareSearch.className = 'sidebar-search-input';
        compareSearch.placeholder = '🔍 Search branch or tag...';
        panel.appendChild(compareSearch);

        let branchSelect = document.createElement('select');
        branchSelect.id = 'compare-branch-select';

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
        window.updateDiffBtnUI = updateToggleBtnUI;

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

        // Wire live search to Compare Against dropdown
        attachSelectFilter(branchSelect, compareSearch, function() {
            targetBranch = branchSelect.value;
            previousHTML = null;
            updateToggleBtnUI();
        });

        updateToggleBtnUI();

        // --- EVENT LISTENERS ---
        branchSelect.addEventListener('change', async function(e) {
            targetBranch = e.target.value;
            previousHTML = null; // Clear cache so it fetches the newly selected branch

            if (!targetBranch || targetBranch === currentBranch) {
                if (diffActive) await toggleDiff();
                updateToggleBtnUI();
                return;
            }

            if (diffActive) {
                await toggleDiff();
            }
            updateToggleBtnUI();
        });

        toggleBtn.addEventListener('click', async function() {
            if (!targetBranch || targetBranch === currentBranch) return;
            await toggleDiff();
            updateToggleBtnUI();
        });

        panel.appendChild(branchSelect);
        panel.appendChild(toggleBtn);

        if (versionSelect && versionSelect.parentNode) {
            versionSelect.insertAdjacentElement('afterend', panel);
        } else {
            document.body.appendChild(panel);
        }
    }
