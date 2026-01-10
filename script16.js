/* =========================================
    2. NAVBAR & SCROLL LOGIC
    ========================================= */
const navbar = document.getElementById("navbar");
let lastScrollTop = 0;
let isFilterScroll = false;  // Flag to track filter-initiated scrolls

// Combined Scroll Logic for Navbar and Utility Bar
window.addEventListener("scroll", function() {
    // Skip navbar logic if scroll was triggered by filter button
    if (isFilterScroll) return;
    
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const stc = document.getElementById("stc");

    if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scrolling Down: Hide Navbar, Move STC to top 0
        navbar.classList.add("nav-hidden");
        if(stc) stc.style.top = "0px";
    } else {
        // Scrolling Up: Show Navbar, Move STC to top 70px (nav height)
        navbar.classList.remove("nav-hidden");
        if(stc) {
            if (window.innerWidth <= 740) {
                stc.style.top = (navbar.getBoundingClientRect().height) + "px";
            } else {
                stc.style.top = "70px";
            }
        }
    }
    lastScrollTop = scrollTop;
});

// Dropdown hover logic with delay
const navDropdown = document.querySelector('.nav-dropdown');
const dropdownContent = document.querySelector('.dropdown-content');
const dropBtn = document.querySelector('.dropbtn');
let dropdownTimeout;

navDropdown.addEventListener('mouseenter', () => {
    if (window.innerWidth > 1200) {
        clearTimeout(dropdownTimeout);
        dropdownContent.classList.add('show');
    }
});

navDropdown.addEventListener('mouseleave', () => {
    if (window.innerWidth > 1200) {
        dropdownTimeout = setTimeout(() => {
            dropdownContent.classList.remove('show');
        }, 300); // 300ms delay to allow mouse to reach dropdown
    }
});

// Mobile: First click opens dropdown, second click navigates
if (dropBtn) {
    dropBtn.addEventListener('click', (e) => {
        if (window.innerWidth <= 1200) {
            if (!dropdownContent.classList.contains('show')) {
                e.preventDefault();
                dropdownContent.classList.add('show');
            }
        }
    });
}

// Close dropdown on click outside
document.addEventListener('click', (e) => {
    if (!navDropdown.contains(e.target)) {
        clearTimeout(dropdownTimeout);
        dropdownContent.classList.remove('show');
    }
    // Hide navbar on click outside
    if (!navbar.contains(e.target)) {
        navbar.classList.add('nav-hidden');
        const stc = document.getElementById("stc");
        if (stc) stc.style.top = "0px";
    }
});

// Horizontal Scroll Helper
// function scrollToGroup(groupName) {
//     const container = document.getElementById('toolBagScroll');
//     const target = document.getElementById(`group-${groupName}`);
    
//     document.getElementById('prospects').scrollIntoView({behavior: 'smooth'});

//     if(container && target) {
//         const scrollLeft = target.offsetLeft - (window.innerWidth - target.offsetWidth) / 2;
//         container.scrollTo({
//             left: scrollLeft,
//             behavior: 'smooth'
//         });
//     }
// }

// --- Orientation/Resize Handler ---
// Ensures the sticky utility bar stays correctly positioned if the device is rotated
window.addEventListener('resize', () => {
    const stc = document.getElementById("stc");
    if (stc && !navbar.classList.contains("nav-hidden")) {
         if (window.innerWidth <= 740) {
            stc.style.top = (navbar.getBoundingClientRect().height) + "px";
        } else {
            stc.style.top = "70px";
        }
    }
});

/* =========================================
    GLOBAL STATE & HELPERS
    ========================================= */
const currencyState = {
    current: 'NGN',
    rates: {
        NGN: 1,
        EUR: 0.00061
    },
    symbols: {
        NGN: '₦',
        EUR: '€'
    }
};
let searchTerm = '';
let fullGrandTotal = 0; // Global state for total inventory cost

/**
 * Scans the inventory and assigns 'essentialCategory' based on 'essentialRank'.
 * Rank 0: Optional
 * Rank 1: Critical
 * Rank 2: Professional/Important
 * Rank 3: Expansion/Student
 * Rank 4: Infrastructure
 * Rank 5: Accessories
 */
function assignEssentialCategories() {
    if (typeof inventory === 'undefined') return;
    
    inventory.forEach(item => {
        if (item.essentialRank !== undefined && item.essentialRank !== null) {
            switch (item.essentialRank) {
                case 0:
                    item.essentialCategory = 'Optional';
                    break;
                case 1:
                    item.essentialCategory = 'Critical';
                    break;
                case 2:
                    item.essentialCategory = 'Professional/Important';
                    break;
                case 3:
                    item.essentialCategory = 'Expansion/Student';
                    break;
                case 4:
                    item.essentialCategory = 'Infrastructure';
                    break;
                case 5:
                    item.essentialCategory = 'Accessories';
                    break;
            }
        }
    });
}

/**
 * Formats a raw number into a currency string with symbol and thousand separators.
 * @param {number} rawPrice The base price in NGN.
 * @returns {string} The formatted currency string based on the current global state.
 */
function getFormattedPrice(rawPrice) {
    const { current, rates, symbols } = currencyState;
    const displayPrice = rawPrice * rates[current];
    const symbol = symbols[current];
    
    const formatted = displayPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return `${symbol}${formatted}`;
}

/**
 * Coerce various price representations into a numeric value (NGN base).
 * Accepts numbers, numeric strings with commas/currency, or descriptive strings.
 * Returns 0 when a numeric value cannot be determined.
 */
function parsePrice(v) {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
        // If it contains the word 'free' treat as 0
        if (/free/i.test(v)) return 0;
        // Extract first numeric-looking token (allow commas and decimals)
        const m = v.match(/[-+]?[0-9]{1,3}(?:[0-9,]*)(?:\.[0-9]+)?|[-+]?[0-9]+(?:\.[0-9]+)?/);
        if (m) {
            const num = m[0].replace(/,/g, '');
            const n = Number(num);
            return Number.isFinite(n) ? n : 0;
        }
        return 0;
    }
    // Fallback for other types
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Updates all price elements on the page by re-rendering the components.
 * This is called by the new currency toggle logic.
 */
function updateAllPrices() {
    // Update static currency symbols in the DOM (specifically for tool-bag-brief)
    const symbol = currencyState.symbols[currencyState.current];
    document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = symbol);

    renderProspects();
    sortSummary(); // This re-renders the summary with the correct currency
    document.getElementById('grand-total-display').textContent = getFormattedPrice(fullGrandTotal);
    document.getElementById('sticky-grand-total').textContent = getFormattedPrice(fullGrandTotal);
    document.getElementById('mobile-grand-total').textContent = getFormattedPrice(fullGrandTotal);
}

/* =========================================
    3. PROSPECTS RENDERING (Cards + Sliders)
    ========================================= */
function renderProspects() {
    const categories = {
        'Learning': document.getElementById('grid-learning'),
        'Repair': document.getElementById('grid-repair'),
        'Productivity': document.getElementById('grid-productivity')
    };

    const counts = { 'Learning': 0, 'Repair': 0, 'Productivity': 0 };
    const totals = {
        'Learning': { base: 0, shipping: 0 },
        'Repair': { base: 0, shipping: 0 },
        'Productivity': { base: 0, shipping: 0 }
    };

    // Prepare fragments to batch-insert DOM nodes per category
    const fragments = {};
    for (let key in categories) {
        if (categories[key]) {
            categories[key].innerHTML = '';
            fragments[key] = document.createDocumentFragment();
        }
    }

    inventory.forEach((item, index) => {
        const container = categories[item.category];
        if (container) {
            // Update counts and totals
            if (counts.hasOwnProperty(item.category)) {
                counts[item.category]++;
            }
            if (totals.hasOwnProperty(item.category)) {
                totals[item.category].base += parsePrice(item.basePrice) * (item.quantity || 1);
                totals[item.category].shipping += parsePrice(item.shipping) * (item.quantity || 1);
            }

            // Check for Productivity Essential styling requirement
            const metaRowClass = (item.category === 'Productivity' && item.isEssential) ? 'productivity-essential' : '';

            // Badge Logic
            let badgeHtml = '';
            if (item.essentialRank === 1) {
                badgeHtml = `<div class="essential-badge">ESSENTIAL <span class="badge-rank-number">${item.essentialRank}</span></div>`;
            } else if (item.essentialRank > 1) {
                badgeHtml = `<div class="rank-badge">RANK <span class="badge-rank-number">${item.essentialRank}</span></div>`;
            }

            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'tool-card-wrapper';

            const card = document.createElement('div');
            card.className = 'tool-card';
            card.style.animationDelay = `${index * 0.05}s`; // Staggered fade-in effect
            card.setAttribute('data-item-id', item.id); // Use ID for reliable lookup

            // Use thumbnail images for tool cards
            const imagesList = item.images && item.images.length > 0 ? item.images : ["https://placehold.co/300x200?text=No+Img"];
            const thumbnailImagesList = imagesList.map(src => {
                const lastDot = src.lastIndexOf('.');
                if (lastDot !== -1) {
                    return src.substring(0, lastDot) + '_thumb' + src.substring(lastDot);
                }
                return src;
            });
            const sliderHTML = thumbnailImagesList.map(src => `<img loading="lazy" decoding="async" src="${src}" alt="${item.name}" onerror="this.src='https://placehold.co/300x200?text=No+Image'">`).join('');

            card.innerHTML = `
                <div class="tool-pics-container">
                    <div class="slider-frame">
                        <div class="slider-track">
                            ${sliderHTML}
                        </div>
                    </div>
                </div>

                <div class="tool-card-body">
                    <div class="tool-meta-row ${metaRowClass}">
                        <span class="card-category">${item.category}</span>
                        ${badgeHtml}
                    </div>
                    <h1 class="tool-name" title="${item.name}">${item.nickname || item.name}</h1>
                    <h5 class="tool-store">${item.productStore || ''}</h5>
                    <h1 class="tool-price" data-base-price-ngn="${parsePrice(item.basePrice)}">${getFormattedPrice(parsePrice(item.basePrice))}</h1>  
                    <a href="${item.productLink || '#'}" target="_blank" class="go-to-page">
                        <span>Go to page</span> 
                    </a>
                </div>
            `;
            card.addEventListener('click', handleCardClick);
            cardWrapper.appendChild(card);
            // Append to fragment for this category — we'll insert once after loop
            fragments[item.category].appendChild(cardWrapper);
        }
    });

    // Append all fragments to their containers in one DOM update each
    for (let key in categories) {
        if (categories[key] && fragments[key]) categories[key].appendChild(fragments[key]);
    }

    // Update category counts
    document.getElementById('learning-count').textContent = counts['Learning'];
    document.getElementById('repair-count').textContent = counts['Repair'];
    document.getElementById('productivity-count').textContent = counts['Productivity'];

    // Update category price summaries
    const categoriesForTotals = ['Learning', 'Repair', 'Productivity'];

    categoriesForTotals.forEach(cat => {
        const catKey = cat.toLowerCase();
        const catTotals = totals[cat];
        const basePriceEl = document.getElementById(`${catKey}-total-price`);
        const shippingEl = document.getElementById(`${catKey}-total-shipping`);
        const totalPlusEl = document.getElementById(`${catKey}-total-plus`);

        if(basePriceEl && shippingEl && totalPlusEl) {
            // Set initial text content using the centralized formatter
            basePriceEl.textContent = getFormattedPrice(catTotals.base).substring(1); // Remove symbol, it's in HTML
            shippingEl.textContent = getFormattedPrice(catTotals.shipping).substring(1);
            totalPlusEl.textContent = getFormattedPrice(catTotals.base + catTotals.shipping).substring(1);
        }
    });
}

function handleCardClick(e) {
    // If the 'Go to page' link is clicked, do nothing and let the link work.
    if (e.target.closest('.go-to-page')) {
        return;
    }

    const card = e.currentTarget;
    const gridContainer = card.closest('.tool-bag-grid-container');
    const itemId = parseInt(card.dataset.itemId, 10);
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    // First, remove any existing panel to ensure a fresh start
    const existingPanel = gridContainer.querySelector('.tool-bag-tdescr');
    if (existingPanel) {
        existingPanel.remove();
    }

    const specsList = Array.isArray(item.brief) ? item.brief : (item.brief ? item.brief.split('\n') : []);
    const specsHTML = specsList.length > 0 ? specsList.map(s => `<li>${s}</li>`).join('') : '<li>N/A</li>';
    // Always use full-size images in the detail panel
    const panelSliderHTML = (item.images || []).map(src => `<img loading="lazy" decoding="async" src="${src}" alt="${item.name}">`).join('');
    const shippingText = parsePrice(item.shipping) > 0 ? `+${getFormattedPrice(parsePrice(item.shipping))} shipping` : 'Free shipping';
    
    let badgeHtml = '';
    if (item.essentialRank === 1) {
        badgeHtml = `<div class="essential-badge">ESSENTIAL <span class="panel-badge-rank">${item.essentialRank}</span></div>`;
    } else if (item.essentialRank > 1) {
        badgeHtml = `<div class="rank-badge">RANK <span class="panel-badge-rank">${item.essentialRank}</span></div>`;
    }

    const rankInfoHTML = item.essentialCategory ? `
    <div class="panel-rank-info">
        <span class="panel-rank-label">Rank</span>
        <span class="panel-rank-category">${item.essentialCategory}</span>
        <span class="panel-rank-circle">${item.essentialRank}</span>
    </div>` : '';

    const variationHTML = item.variation ? `<div class="panel-variation" style="margin-bottom: 10px; font-size: 0.95em; color: aliceblue;"><strong>Variation:</strong> ${item.variation}</div>` : '';

    const usageHTML = item.usage ? `<h3 class="detail-section-title">Usage</h3> <p>${item.usage}</p>` : '';

    // Construct Deal Tag HTML
    let dealBadgeHtml = '';
    if (item.dealTag && item.dealTag !== 'None') {
        if (item.dealTag.startsWith('http')) {
            dealBadgeHtml = `<img src="${item.dealTag}" class="deal-badge-img" alt="Deal Badge">`;
        } else {
            let badgeClass = 'deal-official';
            if (item.dealTag === 'Choice') badgeClass = 'deal-choice';
            else if (item.dealTag === 'Jumia Express') badgeClass = 'deal-express';
            else if (item.dealTag === 'SuperDeals') badgeClass = 'deal-super';
            dealBadgeHtml = `<span class="deal-badge ${badgeClass}">${item.dealTag}</span>`;
        }
    }

    const sourceHTML = `<div class="panel-source-row">
        <span class="panel-source-label">Source:</span> 
        <span class="panel-source-name">${item.source || 'Unknown'}</span>
        ${dealBadgeHtml}
    </div>`;

    const visitButtonHTML = item.productLink ? `
        <a href="${item.productLink}" target="_blank" class="panel-visit-btn">
            Visit Store Page
        </a>` : '';

    const panelHTML = `
    <div class="tool-bag-tdescr">
        <button class="panel-close-btn">&times;</button>
        <div class="panel-header">
            <h2 class="panel-name">${item.name}</h2>
            <p class="panel-store-prefix">From ${item.productStore || ''}</p>
            <div class="panel-subheader">
            <div class="panel-price">${getFormattedPrice(parsePrice(item.basePrice))}<small>${shippingText}</small></div>
            </div>
        </div>
        <div class="panel-slider">
            <div class="slider-frame">
                <div class="slider-track">
                    ${panelSliderHTML}
                </div>
                <div class="panel-meta-row">
                    <span class="card-category">${item.category}</span>
                    ${badgeHtml}
                </div>
                <div class="slider-controls">
                    <button class="slider-btn prev-btn">&#10094;</button>
                    <button class="slider-btn next-btn">&#10095;</button>
                </div>
            </div>
        </div>
        <div class="panel-details">
            ${rankInfoHTML}
            ${variationHTML}
            ${usageHTML}
            <h3 class="detail-section-title">Specifications</h3> <ul class="detail-specs-list">${specsHTML}</ul>
            <h3 class="detail-section-title">Description</h3> <p>${item.description}</p>
            ${sourceHTML}
            ${visitButtonHTML}
        </div>
        <p class="close-panel-hint">Click anywhere outside to close</p>
    </div>
    `;

    // Create and insert the new panel, then slide it in
    gridContainer.insertAdjacentHTML('beforeend', panelHTML);
    const newPanel = gridContainer.querySelector('.tool-bag-tdescr:last-child');

    // Add Close Button Listener
    const closeBtn = newPanel.querySelector('.panel-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const intervalId = newPanel.dataset.sliderIntervalId;
            if (intervalId) clearInterval(parseInt(intervalId, 10));
            newPanel.classList.remove('is-visible');
            newPanel.addEventListener('transitionend', () => newPanel.remove(), { once: true });
        });
    }

    // Use a small delay to ensure the transition triggers correctly
    requestAnimationFrame(() => {
        if (newPanel) {
            newPanel.classList.add('is-visible');
            // Initialize the slider for this new panel
            initPanelSlider(newPanel);
        }
    });
}

/**
 * Initializes the image slider for a newly created detail panel.
 * @param {HTMLElement} panelElement The panel element (.tool-bag-tdescr).
 */
function initPanelSlider(panelElement) {
    const track = panelElement.querySelector('.slider-track');
    if (!track) return;

    const images = track.querySelectorAll('img');

    // Dynamic Zoom Logic
    let zoomedImg = null;
    track.addEventListener('mousemove', (e) => {
        if (e.target.tagName === 'IMG') {
            const img = e.target;
            if (zoomedImg && zoomedImg !== img) {
                zoomedImg.style.transform = "scale(1)";
                zoomedImg.style.transformOrigin = "center center";
            }
            zoomedImg = img;
            const rect = img.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xPercent = (x / rect.width) * 100;
            const yPercent = (y / rect.height) * 100;
            img.style.transformOrigin = `${xPercent}% ${yPercent}%`;
            img.style.transform = "scale(2)";
        }
    });

    track.addEventListener('mouseleave', () => {
        if (zoomedImg) {
            zoomedImg.style.transform = "scale(1)";
            zoomedImg.style.transformOrigin = "center center";
            zoomedImg = null;
        }
    });

    if (images.length <= 1) {
        // Hide controls if there is only one image
        const controls = panelElement.querySelector('.slider-controls');
        if (controls) controls.style.display = 'none';
        return;
    }

    let currentIndex = 0;
    const totalSlides = images.length;
    let intervalId;

    const updateSlide = () => {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
    };

    const startAutoSlide = () => {
        // Clear any existing interval to prevent conflicts
        if (intervalId) clearInterval(intervalId);
        
        intervalId = setInterval(() => {
            currentIndex = (currentIndex + 1) % totalSlides;
            updateSlide();
        }, 4000); // Reduced to 4 seconds
    };

    // Manual Controls
    const prevBtn = panelElement.querySelector('.prev-btn');
    const nextBtn = panelElement.querySelector('.next-btn');

    if (prevBtn) prevBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent panel from closing
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateSlide();
        startAutoSlide(); // Reset timer on manual interaction
    });

    if (nextBtn) nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % totalSlides;
        updateSlide();
        startAutoSlide();
    });

    // Pause on hover (Magnification)
    track.addEventListener('mouseenter', () => {
        if (intervalId) clearInterval(intervalId);
    });

    // Resume on mouse leave
    track.addEventListener('mouseleave', () => {
        startAutoSlide();
    });

    // Start the initial timer
    startAutoSlide();

    // Store the interval ID on the panel so we can clear it on close
    // We use a getter/setter approach or just assign the ID directly if it's a primitive
    // Note: setInterval returns a number in browser, so this works.
    panelElement.dataset.sliderIntervalId = intervalId;
}

/* =========================================
    4. SUMMARY RENDERING (Lazy-loaded via summary.js)
    =========================================
    The summary rendering functions are now in summary.js
    and are loaded lazily when the summary section header
    enters the viewport (via IntersectionObserver).
    
    Global state variables required:
    - currentFilter, currentSort, fullGrandTotal (defined in summary.js)
    - Functions: renderSummary(), filterSummary(), sortSummary() (in summary.js)
    ========================================= */

    // =========================================
    // REVISED PDF DOWNLOAD LOGIC
    // =========================================
    const pdfBtn = document.querySelector('.dld-pdf');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            if (!window.jspdf) {
                alert("PDF Library not loaded. Check internet connection.");
                return;
            }
            const { jsPDF } = window.jspdf;

            // Provide feedback
            const originalText = pdfBtn.querySelector('h1').innerText;
            pdfBtn.querySelector('h1').innerText = "Generating PDF...";

            try {
                const doc = new jsPDF({ format: 'a4' });
                const pageWidth = doc.internal.pageSize.width;
                const pageHeight = doc.internal.pageSize.height;
                const margin = 10; // Reduced margin for "thin" look
                let yPos = 10;
                
                // Define layout variables
                const imageSize = 15;
                const textStartX = margin + imageSize + 5; 
                const maxNameWidth = pageWidth - textStartX - margin - 45; // Reserve space for price column

                // Helper to format price for PDF (avoiding unicode symbols)
                const getPdfPrice = (rawPrice) => {
                    const { current, rates } = currencyState;
                    const displayPrice = rawPrice * rates[current];
                    const formatted = displayPrice.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                    return `${current} ${formatted}`;
                };

                // --- 1. DATA PREPARATION ---
                // Calculate specific totals
                const grandTotal = inventory.reduce((sum, i) => sum + ((parsePrice(i.basePrice) + parsePrice(i.shipping)) * (i.quantity || 1)), 0);
                const totalBasePrice = inventory.reduce((sum, i) => sum + (parsePrice(i.basePrice) * (i.quantity || 1)), 0);
                const totalShipping = inventory.reduce((sum, i) => sum + (parsePrice(i.shipping) * (i.quantity || 1)), 0);

                // Group Data
                const categories = {};
                inventory.forEach(item => {
                    if (!categories[item.category]) categories[item.category] = [];
                    categories[item.category].push(item);
                });

                // --- 2. HEADER SECTION ---
                // Left: Website Name
                doc.setFont("helvetica", "bold");
                doc.setFontSize(16);
                doc.setTextColor(40, 40, 40);
                doc.text("CURE PROSPECTS 2025-2026", margin, yPos + 6);

                // Right: Grand Total (Large)
                doc.setFontSize(18);
                doc.setTextColor(0, 0, 0);
                doc.text(getPdfPrice(grandTotal), pageWidth - margin, yPos + 6, { align: "right" });

                // Right: Small Breakdown (Underneath)
                yPos += 12;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100); // Grey text
                const totalBreakdownText = `Products: ${getPdfPrice(totalBasePrice)} + Shipping: ${getPdfPrice(totalShipping)}`;
                doc.text(totalBreakdownText, pageWidth - margin, yPos, { align: "right" });

                // Header Divider Line
                yPos += 5;
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.line(margin, yPos, pageWidth - margin, yPos);
                yPos += 10; // Space before first category

                // --- 3. CATEGORY & ITEM LOOP ---
                const categoryOrder = ['Learning', 'Repair', 'Productivity']; // Define order

                categoryOrder.forEach(catName => {
                    if (!categories[catName]) return;
                    const items = categories[catName];

                    // Check space for Category Header
                    if (yPos > pageHeight - margin - 20) { doc.addPage(); yPos = margin + 10; }

                    // Draw Category Title
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(14);
                    doc.setTextColor(0, 51, 102); // Dark Blue
                    doc.text(catName.toUpperCase(), margin, yPos);
                    yPos += 10;

                    // Loop Items
                    items.forEach(item => {
                        const quantity = item.quantity || 1;
                        const unitBase = parsePrice(item.basePrice);
                        const unitShip = parsePrice(item.shipping || 0);
                        const totalCost = (unitBase + unitShip) * quantity;
                        
                        let breakdownText = `Qty: ${quantity} | Base: ${getPdfPrice(unitBase)}`;
                        if (unitShip > 0) {
                            breakdownText += ` | Ship: ${getPdfPrice(unitShip)}`;
                        } else {
                            breakdownText += ` | Free Ship`;
                        }
                        
                        // Item Row Height (Generous height for layout)
                        const rowHeight = 25; 

                        // Check Page Break
                        if (yPos + rowHeight > pageHeight - margin) {
                            doc.addPage();
                            yPos = margin + 10;
                        }

                        // --- A. IMAGE (Thumbnail Box) ---
                        // Note: Loading external URLs fails in PDF often due to CORS. 
                        // We draw a clean gray placeholder box to keep layout professional.
                        doc.setFillColor(240, 240, 240);
                        doc.rect(margin, yPos, imageSize, imageSize, 'F'); // X, Y, W, H
                        doc.setFontSize(6);
                        doc.setTextColor(150, 150, 150);
                        doc.text("IMG", margin + 4, yPos + 9);
                        
                        // Tool Name
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(12);
                        doc.setTextColor(0, 0, 0);
                        
                        // Wrap text logic
                        let nameLines = doc.splitTextToSize(item.nickname || item.name, maxNameWidth);
                        
                        // Limit to 2 lines, add "..." if longer
                        if (nameLines.length > 2) {
                            let secondLine = nameLines[1];
                            // Simple truncation for the second line to ensure it fits visually
                            if (secondLine.length > 3) {
                                secondLine = secondLine.substring(0, secondLine.length - 3) + "...";
                            }
                            nameLines = [nameLines[0], secondLine];
                        }
                        
                        doc.text(nameLines, textStartX, yPos + 5);

                        // Store & Shipping Info (Next line)
                        // Adjust Y position based on how many lines the name took
                        const detailYOffset = nameLines.length > 1 ? 11 + 5 : 11; // Add 5 units if 2 lines
                        
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(10);
                        doc.setTextColor(80, 80, 80);
                        doc.text(`${item.productStore} | ${item.source}`, textStartX, yPos + detailYOffset);

                        // --- C. RIGHT SIDE: Prices ---
                        // Item Total Price
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(12);
                        doc.setTextColor(0, 0, 0);
                        doc.text(getPdfPrice(totalCost), pageWidth - margin, yPos + 5, { align: "right" });

                        // Small Breakdown text underneath
                        doc.setFont("helvetica", "italic");
                        doc.setFontSize(8);
                        doc.setTextColor(120, 120, 120);
                        doc.text(breakdownText, pageWidth - margin, yPos + 11, { align: "right" });

                        // --- D. SEPARATOR ---
                        // Light line between items
                        yPos += rowHeight;
                        doc.setDrawColor(230, 230, 230);
                        doc.line(margin, yPos - 8, pageWidth - margin, yPos - 8);
                    });

                    yPos += 5; // Extra space after category group
                });

                // Final Save
                doc.save('CURE_Prospects_2025-2026_Inventory.pdf');

            } catch (err) {
                console.error(err);
                alert("Error generating PDF. See console for details.");
            } finally {
                pdfBtn.querySelector('h1').innerText = originalText;
            }
        });
    }

/* =========================================
    7. INIT
    ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    // Assign essential categories dynamically before processing totals
    assignEssentialCategories();

    // Calculate full grand total (will be updated when summary.js loads)
    const totalGrandTotal = inventory.reduce((sum, item) => sum + ((parsePrice(item.basePrice) + parsePrice(item.shipping || 0)) * (item.quantity || 1)), 0);
    document.getElementById('grand-total-display').textContent = getFormattedPrice(totalGrandTotal);
    document.getElementById('sticky-grand-total').textContent = getFormattedPrice(totalGrandTotal);
    document.getElementById('mobile-grand-total').textContent = getFormattedPrice(totalGrandTotal);

    renderProspects();
    
    // Summary rendering is now lazy-loaded (see IntersectionObserver setup below)
    // The summary.js script will be loaded and renderSummary() called when
    // the #summary-header comes into viewport
    
    // setupScrollSnapping(); // This function is not defined in the provided files.
    // setupDownloads(); // This function is not defined in the provided files.

    // --- Tool Bag Nav Click-to-Expand Logic ---
    const toolBagNav = document.querySelector('.tool-bag-nav');
    if (toolBagNav) {
        toolBagNav.addEventListener('click', (e) => {
            // If not active, prevent default link action and expand
            if (!toolBagNav.classList.contains('active')) {
                e.preventDefault();
                toolBagNav.classList.add('active');
            }
        });
        // Close if clicked outside
        document.addEventListener('click', (e) => {
            if (!toolBagNav.contains(e.target)) {
                toolBagNav.classList.remove('active');
            }
        });
    }

    // --- Mobile: Click Brief Header to Scroll to Grid ---
    const briefHeaders = document.querySelectorAll('.tool-bag-brief-brief h1');
    briefHeaders.forEach(header => {
        header.addEventListener('click', () => {
            if (window.innerWidth <= 1200) {
                const group = header.closest('.tools-group');
                if (group) {
                    const gridContainer = group.querySelector('.tool-bag-grid-container');
                    if (gridContainer) {
                        gridContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }
        });
    });

    // --- Font Size Toggle Logic ---
    const fontToggleBtn = document.getElementById('font-toggle-btn');
    
    // Check for saved preference
    const savedFontPref = localStorage.getItem('fontPreference');
    if (savedFontPref === 'large') {
        document.body.classList.add('large-font');
    }

    if (fontToggleBtn) {
        fontToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('large-font');
            const isLarge = document.body.classList.contains('large-font');
            localStorage.setItem('fontPreference', isLarge ? 'large' : 'normal');
        });
    }

    // --- EVENT LISTENERS ---

    // Search Bar
    const searchBar = document.getElementById('search-bar');
    searchBar.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        sortSummary(); // Re-renders summary with all current filters/sorts
    });

    // --- Synchronized Currency Toggle Logic ---
    const currencyBtns = [
        document.getElementById('currency-toggle-btn'),
        document.getElementById('currency-toggle-btn2'),
        document.getElementById('currency-toggle-btn2'),
        document.getElementById('mobile-currency-btn')
    ].filter(btn => btn); // Filter out nulls

    function toggleCurrency() {
        // Cycle through NGN -> EUR -> NGN
        if (currencyState.current === 'NGN') currencyState.current = 'EUR';
        else currencyState.current = 'NGN';

        const nextCurrency = currencyState.current === 'NGN' ? 'EUR' : 'NGN';

        currencyBtns.forEach(btn => {
            const textSpan = btn.querySelector('.link-descr');
            if (textSpan) {
                textSpan.textContent = `Switch to ${nextCurrency}`;
            } else {
                btn.textContent = `Switch to ${nextCurrency}`;
            }
        });
        updateAllPrices(); // Re-render content with new prices
    }

    currencyBtns.forEach(btn => btn.addEventListener('click', toggleCurrency));

    // --- Panel Closing Logic (with DOM removal) ---
    document.addEventListener('click', function(event) {
        const openPanel = document.querySelector('.tool-bag-tdescr.is-visible');
        if (!openPanel) return;

        // Do not close if the click is on the panel itself or on any tool card
        const isClickOnToolCard = event.target.closest('.tool-card');
        const isClickInsidePanel = openPanel.contains(event.target);

        if (!isClickInsidePanel && !isClickOnToolCard) {
            // Clear the slider interval before closing to prevent memory leaks
            const intervalId = openPanel.dataset.sliderIntervalId;
            if (intervalId) {
                clearInterval(parseInt(intervalId, 10));
            }

            openPanel.classList.remove('is-visible');
            // After the slide-out animation finishes, remove the element from the DOM.
            openPanel.addEventListener('transitionend', () => openPanel.remove(), { once: true });
        }
    });

    // --- Navbar Dropdown Scroll Logic ---
    const dropdownLinks = document.querySelectorAll('.dropdown-content a');
    const toolBagSection = document.getElementById('prospects');
    const toolBagContainer = document.querySelector('.tool-bag');

    dropdownLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href'); // e.g., "#learn-tools"
            const targetId = href ? href.substring(1) : null;
            const targetGroup = document.getElementById(targetId);

            if (targetGroup && toolBagContainer && toolBagSection) {
                // 1. Vertical Scroll First
                toolBagSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // 2. Horizontal Scroll (Delayed to allow vertical to start)
                setTimeout(() => {
                    // Dynamic Scroll Calculation
                    const scrollPos = targetGroup.offsetLeft - (window.innerWidth * 0.05); // 5% margin

                    toolBagContainer.scrollTo({
                        left: scrollPos,
                        behavior: 'smooth'
                    });
                }, 600); // 600ms delay for visual sequencing
            }
        });
    });

    // --- Mobile Utility Bar Logic ---
    const searchIconBtn = document.getElementById('search-icon-btn');
    const searchInput = document.getElementById('search-bar');
    const filterHamBtn = document.getElementById('filter-hamburger-btn');
    const filterContainer = document.querySelector('.summary-filter-container');

    if (searchIconBtn && searchInput) {
        searchIconBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Expand search bar and hide icon with animation
            searchInput.classList.add('expanded');
            searchIconBtn.classList.add('hide-anim');
            searchInput.focus();
        });

        // Close search bar when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchIconBtn.contains(e.target)) {
                searchInput.classList.remove('expanded');
                searchIconBtn.classList.remove('hide-anim'); // Show icon again
            }
        });
    }

    if (filterHamBtn && filterContainer) {
        filterHamBtn.addEventListener('click', () => {
            const isNowOpen = filterContainer.classList.toggle('show');
            document.querySelector('.utility-top-row').classList.toggle('filters-expanded', isNowOpen);
            if (!isNowOpen) {
                // When closing, update lastScrollTop to prevent navbar from showing
                lastScrollTop = 0;
            }
        });

        // Close filters when clicking outside
        document.addEventListener('click', (e) => {
            if (filterContainer.classList.contains('show') && 
                !filterContainer.contains(e.target) && 
                !filterHamBtn.contains(e.target)) {
                filterContainer.classList.remove('show');
                document.querySelector('.utility-top-row').classList.remove('filters-expanded');
                // When closing, update lastScrollTop to prevent navbar from showing
                lastScrollTop = 0;
            }
        });
    }

    /* =========================================
        LAZY LOAD: Summary Section via IntersectionObserver
        ========================================= */
    // Load summary.js and render summary when #summary-header enters viewport
    let summaryLoaded = false;
    const summaryHeader = document.getElementById('summary-header');
    
    console.log('Summary header element:', summaryHeader);
    
    if (summaryHeader) {
        const summaryObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                console.log('Summary header visibility:', entry.isIntersecting);
                if (entry.isIntersecting && !summaryLoaded) {
                    summaryLoaded = true;
                    console.log('Loading summary.min.js...');
                    
                    // Load summary.js dynamically
                    const summaryScript = document.createElement('script');
                    summaryScript.src = 'summary.min.js';
                    summaryScript.onload = () => {
                        console.log('Summary.js loaded successfully');
                        // Once summary.js is loaded, renderSummary is available
                        // Initialize fullGrandTotal state
                        fullGrandTotal = inventory.reduce((sum, item) => 
                            sum + ((parsePrice(item.basePrice) + parsePrice(item.shipping || 0)) * (item.quantity || 1)), 0
                        );
                        
                        console.log('Calling renderSummary with inventory:', inventory.length, 'items');
                        // Render the summary with all inventory items
                        renderSummary(inventory);
                        
                        // Stop observing once loaded
                        summaryObserver.unobserve(summaryHeader);
                    };
                    summaryScript.onerror = () => {
                        console.error('Failed to load summary.js');
                    };
                    document.body.appendChild(summaryScript);
                }
            });
        }, { threshold: 0.01 }); // Trigger when 1% of header is visible
        
        summaryObserver.observe(summaryHeader);
    } else {
        console.warn('Summary header element not found!');
    }
});              