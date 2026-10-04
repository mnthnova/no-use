    async function injectDiffControls() {
        if (document.getElementById('diff-settings-panel')) return;

        let panel = document.createElement('div');
        panel.id = 'diff-settings-panel';

        // 1. Unified CSS for the Custom Searchable Dropdowns
        const style = document.createElement('style');
        style.textContent = `
            #diff-settings-panel {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid rgba(255, 255, 255, 0.15);
                display: flex;
                flex-direction: column;
                gap: 6px;
                width: 100%;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            }
            .diff-sidebar-label {
                font-size: 11px;
                font-weight: 700;
                color: #c9d1d9;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                text-align: left;
            }
            /* Custom Searchable Dropdown UI */
            .custom-dropdown-wrapper {
                position: relative;
                width: 100%;
                margin-top: 2px;
            }
            .cd-display {
                background-color: #ffffff;
                border: 1px solid #d1d5da;
                border-radius: 6px;
                padding: 7px 10px;
                font-size: 12.5px;
                font-weight: 500;
                color: #24292e;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                user-select: none;
                transition: all 0.2s;
            }
            .cd-display:hover { border-color: #0366d6; }
            .cd-menu {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                margin-top: 4px;
                background: #ffffff;
                border: 1px solid #d1d5da;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 99999;
                flex-direction: column;
                overflow: hidden;
            }
            .cd-menu.show { display: flex; }
            .cd-search {
                border: none;
                border-bottom: 1px solid #eaecef;
                padding: 8px 10px;
                font-size: 12px;
                outline: none;
                width: 100%;
                box-sizing: border-box;
                background: #f6f8fa;
                color: #24292e;
            }
            .cd-search:focus { background: #ffffff; }
            .cd-options-container {
                max-height: 200px;
                overflow-y: auto;
            }
            .cd-optgroup {
                padding: 6px 10px;
                font-size: 11px;
                font-weight: 700;
                color: #586069;
                background: #f6f8fa;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .cd-option {
                padding: 6px 16px;
                font-size: 12.5px;
                color: #24292e;
                cursor: pointer;
            }
            .cd-option:hover { background: #0366d6; color: #ffffff; }
            .cd-option.selected { font-weight: 600; background: #f1f8ff; color: #0366d6; }
            .cd-option.selected:hover { background: #0366d6; color: #ffffff; }
            .cd-option.disabled { color: #959da5; cursor: not-allowed; background: #ffffff; }
            .cd-no-results { padding: 8px 10px; font-size: 12px; color: #586069; text-align: center; }

            /* Toggle Button */
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
            }
            #diff-toggle-btn:hover:not(:disabled) { background-color: #0255b3; }
            #diff-toggle-btn.diff-active { background-color: #2ea44f; }
            #diff-toggle-btn:disabled { background-color: #484f58; color: #8b949e; cursor: not-allowed; }
            .status-dot { width: 8px; height: 8px; border-radius: 50%; background-color: #ffffff; display: inline-block; }
        `;
        document.head.appendChild(style);

        // 2. Logic to convert a boring <select> into a sleek Searchable Dropdown
        function createUnifiedDropdown(selectEl, searchPlaceholder) {
            selectEl.style.display = 'none'; // Hide native select

            const wrapper = document.createElement('div');
            wrapper.className = 'custom-dropdown-wrapper';

            const displayBtn = document.createElement('div');
            displayBtn.className = 'cd-display';
            displayBtn.innerHTML = `<span>${selectEl.options[selectEl.selectedIndex]?.text || 'Select...'}</span> <i class="fa fa-caret-down"></i>`;

            const menu = document.createElement('div');
            menu.className = 'cd-menu';

            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'cd-search';
            searchInput.placeholder = searchPlaceholder;

            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'cd-options-container';

            function renderList(query = "") {
                optionsContainer.innerHTML = '';
                let hasMatches = false;

                Array.from(selectEl.children).forEach(child => {
                    if (child.tagName === 'OPTGROUP') {
                        const matches = Array.from(child.children).filter(o => o.text.toLowerCase().includes(query));
                        if (matches.length > 0) {
                            hasMatches = true;
                            const groupLabel = document.createElement('div');
                            groupLabel.className = 'cd-optgroup';
                            groupLabel.textContent = child.label;
                            optionsContainer.appendChild(groupLabel);

                            matches.forEach(o => {
                                const opt = document.createElement('div');
                                opt.className = 'cd-option' + (o.selected ? ' selected' : '') + (o.disabled ? ' disabled' : '');
                                opt.textContent = o.text;
                                if (!o.disabled) {
                                    opt.addEventListener('click', (e) => {
                                        e.stopPropagation();
                                        selectEl.value = o.value;
                                        displayBtn.querySelector('span').textContent = o.text;
                                        menu.classList.remove('show');
                                        selectEl.dispatchEvent(new Event('change'));
                                    });
                                }
                                optionsContainer.appendChild(opt);
                            });
                        }
                    }
                });

                if (!hasMatches) {
                    optionsContainer.innerHTML = '<div class="cd-no-results">No matches found</div>';
                }
            }

            // Click triggers
            displayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isShowing = menu.classList.contains('show');
                document.querySelectorAll('.cd-menu').forEach(m => m.classList.remove('show')); // Close others
                if (!isShowing) {
                    menu.classList.add('show');
                    searchInput.value = '';
                    renderList();
                    searchInput.focus();
                }
            });

            searchInput.addEventListener('input', (e) => renderList(e.target.value.trim().toLowerCase()));
            searchInput.addEventListener('click', (e) => e.stopPropagation());
            document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) menu.classList.remove('show'); });

            selectEl.addEventListener('change', () => {
                const selectedOpt = selectEl.options[selectEl.selectedIndex];
                if (selectedOpt) displayBtn.querySelector('span').textContent = selectedOpt.text;
            });

            menu.appendChild(searchInput);
            menu.appendChild(optionsContainer);
            wrapper.appendChild(displayBtn);
            wrapper.appendChild(menu);

            selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);
            renderList();
        }

        // 3. Build UI Elements
        let label = document.createElement('div');
        label.className = 'diff-sidebar-label';
        label.textContent = "Compare against:";
        panel.appendChild(label);

        let branchSelect = document.createElement('select');
        branchSelect.id = 'compare-branch-select';
        panel.appendChild(branchSelect);

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

        // 4. Fetch JSON and Populate Options
        try {
            let basePath = window.location.origin + "/" + window.location.pathname.split("/")[1];
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

                    if (v.name === currentBranch) opt.disabled = true;

                    if (v.type === 'tag') tagGroup.appendChild(opt);
                    else branchGroup.appendChild(opt);
                });

                branchSelect.appendChild(branchGroup);
                branchSelect.appendChild(tagGroup);

                // Smart Default
                let selectedIndex = -1;
                for (let i = 0; i < branchSelect.options.length; i++) {
                    if (branchSelect.options[i].value === 'main' && currentBranch !== 'main') {
                        selectedIndex = i; break;
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

        // Apply Custom UI to Compare Select
        createUnifiedDropdown(branchSelect, "Search branch or tag...");
        updateToggleBtnUI();

        // 5. Event Listeners
        branchSelect.addEventListener('change', async function(e) {
            targetBranch = e.target.value;
            previousHTML = null;
            if (!targetBranch || targetBranch === currentBranch) {
                if (diffActive) await toggleDiff();
                updateToggleBtnUI();
                return;
            }
            if (diffActive) await toggleDiff();
            updateToggleBtnUI();
        });

        toggleBtn.addEventListener('click', async function() {
            if (!targetBranch || targetBranch === currentBranch) return;
            await toggleDiff();
            updateToggleBtnUI();
        });

        panel.appendChild(toggleBtn);

        // 6. Mount and apply Custom UI to the existing Versions Select
        const versionSelect = document.getElementById('version-select');
        if (versionSelect && versionSelect.parentNode) {
            if (versionSelect.previousElementSibling) {
                versionSelect.previousElementSibling.className = 'diff-sidebar-label';
                versionSelect.previousElementSibling.style.margin = '0 0 2px 0';
            }
            createUnifiedDropdown(versionSelect, "Search versions...");
            versionSelect.insertAdjacentElement('afterend', panel);
        } else {
            document.body.appendChild(panel);
        }
    }
