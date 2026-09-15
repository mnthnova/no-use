document.addEventListener("DOMContentLoaded", function() {
    // 1. DYNAMIC URL PARSING
    var url = window.location.href;
    
    // Detect which language folder we are currently sitting in
    var langMatch = url.match(/(\/mixed\/|\/en\/|\/ja\/)/);
    var currentLang = langMatch ? langMatch[1].replace(/\//g, '') : 'mixed';
    
    // Split the URL to get the base path and the current page name (e.g. APPLICATION.html)
    var splitIndex = langMatch ? url.indexOf('/' + currentLang + '/') : -1;
    var basePath = splitIndex !== -1 ? url.substring(0, splitIndex) : '';
    var pagePath = splitIndex !== -1 ? url.substring(splitIndex + currentLang.length + 2) : '';

    // 2. LANGUAGE CYCLING LOGIC
    // Defines what language to switch to next, and what the button should say
    const langConfig = {
        'mixed': { next: 'en', label: '<i class="fa fa-language" style="color: #0366d6;"></i> Switch to English' },
        'en': { next: 'ja', label: '<i class="fa fa-language" style="color: #0366d6;"></i> 日本語 (Japanese)' },
        'ja': { next: 'mixed', label: '<i class="fa fa-language" style="color: #0366d6;"></i> Original (Mixed)' }
    };

    // 3. CREATE FLOATING CONTAINER (Bottom Right)
    var container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: flex-end;
        z-index: 9999;
    `;

    // 4. COMMON CSS FOR BEAUTIFUL BUTTONS
    var btnCSS = `
        background: #ffffff;
        padding: 10px 18px;
        border: 1px solid #e1e4e8;
        border-radius: 25px; /* Perfect pill shape */
        box-shadow: 0 4px 12px rgba(27,31,35,0.15);
        color: #24292e;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    // 5. BUILD LANGUAGE BUTTON
    var langBtn = document.createElement('div');
    langBtn.style.cssText = btnCSS;
    langBtn.innerHTML = langConfig[currentLang].label;
    
    // Hover Effects
    langBtn.addEventListener('mouseenter', () => { langBtn.style.borderColor = '#0366d6'; langBtn.style.color = '#0366d6'; });
    langBtn.addEventListener('mouseleave', () => { langBtn.style.borderColor = '#e1e4e8'; langBtn.style.color = '#24292e'; });
    
    // Click Action: Route to the same page, but in the next language folder
    langBtn.onclick = function() {
        var nextLang = langConfig[currentLang].next;
        if (splitIndex !== -1) {
            window.location.href = basePath + '/' + nextLang + '/' + pagePath;
        }
    };

    // 6. BUILD PDF BUTTON
    var pdfBtn = document.createElement('a');
    pdfBtn.style.cssText = btnCSS;
    pdfBtn.innerHTML = '<i class="fa fa-file-pdf-o" style="color: #d73a49;"></i> Download PDF';
    pdfBtn.target = "_blank";
    
    // Hover Effects
    pdfBtn.addEventListener('mouseenter', () => { pdfBtn.style.borderColor = '#d73a49'; pdfBtn.style.color = '#d73a49'; });
    pdfBtn.addEventListener('mouseleave', () => { pdfBtn.style.borderColor = '#e1e4e8'; pdfBtn.style.color = '#24292e'; });
    
    // Dynamic Pathing: Points directly to the generated PDF for the current language
    // Example: /robust_sync/public/main/pdf/en.pdf
    pdfBtn.href = basePath + '/pdf/' + currentLang + '.pdf';

    // 7. INJECT INTO PAGE
    container.appendChild(langBtn);
    container.appendChild(pdfBtn);
    document.body.appendChild(container);
});





