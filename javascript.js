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
