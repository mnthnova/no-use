document.addEventListener("DOMContentLoaded", function() {
    // 1. DYNAMIC URL PARSING
    var url = window.location.href;
    var langMatch = url.match(/(\/mixed\/|\/en\/|\/ja\/)/);
    var currentLang = langMatch ? langMatch[1].replace(/\//g, '') : 'mixed';
    
    var splitIndex = langMatch ? url.indexOf('/' + currentLang + '/') : -1;
    var basePath = splitIndex !== -1 ? url.substring(0, splitIndex) : '';
    var pagePath = splitIndex !== -1 ? url.substring(splitIndex + currentLang.length + 2) : '';

    var langDisplayNames = {
        'mixed': 'Original (Mixed)',
        'en': 'English',
        'ja': '日本語 (Japanese)'
    };

    // 2. INJECT THE READ-THE-DOCS STYLE CSS
    var style = document.createElement('style');
    style.innerHTML = `
        /* Main Container */
        .custom-rtd-menu { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 13px; }
        
        /* The Dark Floating Trigger Button */
        .rtd-trigger { background: #242424; color: #f8f9fa; padding: 12px 18px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-weight: 600; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: background 0.2s; min-width: 140px; }
        .rtd-trigger:hover { background: #333; }
        
        /* The Popup Panel */
        .rtd-panel { display: none; position: absolute; bottom: 100%; right: 0; margin-bottom: 5px; background: #292929; border: 1px solid #444; border-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); width: max-content; min-width: 200px; flex-direction: column; overflow: hidden; color: #f8f9fa; }
        .rtd-panel.show { display: flex; }
        
        /* Section Headers (Languages / Downloads) */
        .rtd-section-title { background: #1a1a1a; color: #aaa; padding: 10px 15px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #333; border-top: 1px solid #333; margin: 0; }
        .rtd-section-title:first-child { border-top: none; }
        
        /* Clickable Links */
        .rtd-link { display: block; padding: 10px 15px; color: #4db8ff; text-decoration: none; font-weight: 500; transition: all 0.2s; }
        .rtd-link:hover { background: #333; color: #74c9ff; text-decoration: none; }
        
        /* Active Language Highlight */
        .rtd-link.active { color: #28a745; font-weight: bold; cursor: default; }
        .rtd-link.active:hover { background: transparent; }
    `;
    document.head.appendChild(style);

    // 3. BUILD DOM ELEMENTS
    var container = document.createElement('div');
    container.className = 'custom-rtd-menu';

    var panel = document.createElement('div');
    panel.className = 'rtd-panel';

    var availableLangs = [
        { id: 'mixed', label: 'Original (Mixed)', pdfLabel: 'PDF (Mixed)' },
        { id: 'en', label: 'English', pdfLabel: 'PDF (English)' },
        { id: 'ja', label: '日本語 (Japanese)', pdfLabel: 'PDF (Japanese)' }
    ];

    // --- SECTION 1: LANGUAGES ---
    var langTitle = document.createElement('div');
    langTitle.className = 'rtd-section-title';
    langTitle.innerText = 'Languages';
    panel.appendChild(langTitle);

    availableLangs.forEach(function(l) {
        var a = document.createElement('a');
        a.className = 'rtd-link' + (currentLang === l.id ? ' active' : '');
        // Adds a checkmark icon to the currently selected language
        a.innerHTML = (currentLang === l.id ? '<i class="fa fa-check"></i> ' : '') + l.label;
        a.href = basePath !== '' ? basePath + '/' + l.id + '/' + pagePath : '#';
        panel.appendChild(a);
    });

    // --- SECTION 2: DOWNLOADS ---
    var dlTitle = document.createElement('div');
    dlTitle.className = 'rtd-section-title';
    dlTitle.innerText = 'Downloads';
    panel.appendChild(dlTitle);

    availableLangs.forEach(function(l) {
        var a = document.createElement('a');
        a.className = 'rtd-link';
        a.innerHTML = '<i class="fa fa-file-pdf-o" style="color:#d73a49;"></i> ' + l.pdfLabel;
        a.href = basePath !== '' ? basePath + '/pdf/' + l.id + '.pdf' : '#';
        a.target = '_blank';
        panel.appendChild(a);
    });

    // --- MAIN TRIGGER BUTTON ---
    var trigger = document.createElement('div');
    trigger.className = 'rtd-trigger';
    trigger.innerHTML = '<i class="fa fa-book"></i> v: ' + currentLang + ' <i class="fa fa-caret-up" style="margin-left:auto;"></i>';
    
    // Toggle menu visibility on click
    trigger.onclick = function(e) {
        e.stopPropagation();
        panel.classList.toggle('show');
    };

    // Close the menu if the user clicks anywhere else on the screen
    document.addEventListener('click', function() {
        panel.classList.remove('show');
    });
    panel.onclick = function(e) {
        e.stopPropagation(); 
    };

    // 4. ASSEMBLE AND INJECT
    container.appendChild(panel);
    container.appendChild(trigger);
    document.body.appendChild(container);
});














document.addEventListener("DOMContentLoaded", function() {
    // 1. DYNAMIC URL PARSING
    var url = window.location.href;
    var langMatch = url.match(/(\/mixed\/|\/en\/|\/ja\/)/);
    var currentLang = langMatch ? langMatch[1].replace(/\//g, '') : 'mixed';
    
    var splitIndex = langMatch ? url.indexOf('/' + currentLang + '/') : -1;
    var basePath = splitIndex !== -1 ? url.substring(0, splitIndex) : '';
    var pagePath = splitIndex !== -1 ? url.substring(splitIndex + currentLang.length + 2) : '';

    var langs = [
        { id: 'mixed', label: 'Original (Mixed)', short: 'Mixed' },
        { id: 'en', label: 'English', short: 'English' },
        { id: 'ja', label: '日本語 (Japanese)', short: 'Japanese' }
    ];

    // 2. INJECT PROFESSIONAL CSS
    var style = document.createElement('style');
    style.innerHTML = `
        /* Master Container */
        .custom-rt-menu { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        
        /* The Main Button */
        .rt-btn { background: #24292e; color: #fff; padding: 10px 20px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 8px; transition: background 0.2s; }
        .rt-btn:hover { background: #2f363d; }
        
        /* The Expanding Panel */
        .rt-panel { display: none; position: absolute; bottom: 100%; right: 0; margin-bottom: 10px; background: #fff; border: 1px solid #e1e4e8; border-radius: 6px; box-shadow: 0 8px 24px rgba(27,31,35,0.15); width: 240px; overflow: hidden; flex-direction: column; }
        
        /* Show panel on hover */
        .custom-rt-menu:hover .rt-panel { display: flex; }
        
        /* Section Dividers */
        .rt-section { padding: 10px 0; border-bottom: 1px solid #eaecef; }
        .rt-section:last-child { border-bottom: none; }
        
        /* Section Headers (Languages / Downloads) */
        .rt-title { padding: 0 20px 6px; font-size: 11px; font-weight: 700; color: #586069; text-transform: uppercase; letter-spacing: 0.5px; }
        
        /* Clickable Links */
        .rt-link { display: flex; padding: 6px 20px; color: #24292e; text-decoration: none; font-size: 13px; font-weight: 500; align-items: center; gap: 8px; transition: background 0.2s; }
        .rt-link:hover { background: #f6f8fa; color: #0366d6; }
        
        /* Highlight the active language */
        .rt-active { font-weight: 700; background: #f1f8ff; color: #0366d6; border-left: 3px solid #0366d6; padding-left: 17px; }
    `;
    document.head.appendChild(style);

    // 3. BUILD DOM ELEMENTS
    var container = document.createElement('div');
    container.className = 'custom-rt-menu';

    var panel = document.createElement('div');
    panel.className = 'rt-panel';

    // --- SECTION 1: LANGUAGES ---
    var langSection = document.createElement('div');
    langSection.className = 'rt-section';
    langSection.innerHTML = '<div class="rt-title">Languages</div>';
    
    langs.forEach(function(l) {
        var a = document.createElement('a');
        a.className = 'rt-link' + (currentLang === l.id ? ' rt-active' : '');
        a.innerHTML = l.label;
        a.href = (splitIndex !== -1) ? basePath + '/' + l.id + '/' + pagePath : '#';
        langSection.appendChild(a);
    });

    // --- SECTION 2: DOWNLOADS (PDFs) ---
    var pdfSection = document.createElement('div');
    pdfSection.className = 'rt-section';
    pdfSection.innerHTML = '<div class="rt-title">Downloads</div>';
    
    langs.forEach(function(l) {
        var a = document.createElement('a');
        a.className = 'rt-link';
        a.innerHTML = '<i class="fa fa-file-pdf-o" style="color:#d73a49;"></i> PDF (' + l.short + ')';
        a.href = basePath + '/pdf/' + l.id + '.pdf';
        a.target = '_blank';
        pdfSection.appendChild(a);
    });

    // 4. ASSEMBLE PANEL
    panel.appendChild(langSection);
    panel.appendChild(pdfSection);

    // 5. BUILD MAIN BUTTON
    var btn = document.createElement('div');
    btn.className = 'rt-btn';
    var displayLang = langs.find(l => l.id === currentLang).short; 
    // Button looks like: [Book Icon]  v: English  [Up Arrow]
    btn.innerHTML = '<i class="fa fa-book"></i> v: ' + displayLang + ' <i class="fa fa-caret-up"></i>';

    // 6. INJECT INTO PAGE
    container.appendChild(panel);
    container.appendChild(btn);
    document.body.appendChild(container);
});
