/**
 * SUMMARY.JS - Lazy-loaded module for summary section rendering
 * Dependencies: 
 *   - Global: inventory[], currencyState, parsePrice(), getFormattedPrice()
 *   - From main_inventory_data.js: inventory array must be loaded
 *   - Helper functions from script16.js must be available globally
 * 
 * This file is dynamically loaded when the summary section header
 * comes into viewport (IntersectionObserver trigger in script16.js)
 */

/* =========================================
    SUMMARY STATE & RENDERING
    ========================================= */

let currentFilter = 'all';
let currentSort = 'default';
// fullGrandTotal is now declared globally in script16.js

/**
 * Main summary rendering function.
 * Generates all summary cards and updates totals.
 * @param {Array} items - The items to render
 */
function renderSummary(items) {
    const grid = document.getElementById('summaryGrid');
    const countEl = document.getElementById('count');
    const totalEl = document.getElementById('grand-total-display');
    // Elements for the Dynamic Total Logic
    const stickyTotalEl = document.getElementById('sticky-dynamic-price');
    const mobileDynamicEl = document.getElementById('mobile-dynamic-total');

    if(!grid) return;

    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    let grandTotal = 0;

    items.forEach(item => {
        const quantity = item.quantity || 1;
        const unitBase = parsePrice(item.basePrice);
        const unitShip = parsePrice(item.shipping || 0);
        const totalCost = (unitBase + unitShip) * quantity;
        grandTotal += totalCost;

        let badgeHtml = '';
        if (item.dealTag && item.dealTag !== 'None') {
            if (item.dealTag.startsWith('http')) {
                badgeHtml = `<img src="${item.dealTag}" class="deal-badge-img" alt="Deal Badge">`;
            } else {
                let badgeClass = 'deal-official';
                if (item.dealTag === 'Choice') badgeClass = 'deal-choice';
                else if (item.dealTag === 'Jumia Express') badgeClass = 'deal-express';
                else if (item.dealTag === 'SuperDeals') badgeClass = 'deal-super';
                badgeHtml = `<div class="deal-badge ${badgeClass}">${item.dealTag}</div>`;
            }
        }

        // Badge Logic for Summary
        let essentialHtml = '';
        if (item.essentialRank === 1) {
            essentialHtml = `<div class="essential-badge">ESSENTIAL <span class="badge-rank-number">${item.essentialRank}</span></div>`;
        } else if (item.essentialRank > 1) {
            essentialHtml = `<div class="rank-badge">RANK <span class="badge-rank-number">${item.essentialRank}</span></div>`;
        }

        const shippingHtml = unitShip === 0 
            ? '<span class="free-ship-tag">Free Ship</span>' 
            : `<div class="shipping-info-container">
                   <div class="shipping-label">Shipping</div>
                   <span class="shipping-info">${getFormattedPrice(unitShip)}</span>
               </div>`;

        // Slider Generation - use thumbnail images for faster load times
        const imagesList = item.images && item.images.length > 0 ? item.images : ["https://placehold.co/300x200?text=No+Img"];
        const thumbnailImagesList = imagesList.map(src => {
            // Convert original image path to thumbnail version
            const lastDot = src.lastIndexOf('.');
            if (lastDot !== -1) {
                return src.substring(0, lastDot) + '_thumb' + src.substring(lastDot);
            }
            return src;
        });
        const sliderHTML = thumbnailImagesList.map(src => `<img loading="lazy" decoding="async" src="${src}" alt="${item.name}">`).join('');

        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'summary-card-wrapper';

        const card = document.createElement('div');
        card.className = 'summary-card' + (item.essentialRank === 1 ? ' essential' : '');
        card.innerHTML = `
            <div class="card-image">
                <div class="slider-frame">
                    <div class="slider-track">
                        ${sliderHTML}
                    </div>
                </div><div class="source-tag">${item.source}${badgeHtml}</div>
                <div class="meta-row">
                    <span class="card-category">${item.category}</span>
                ${essentialHtml}
                </div>
            </div>
            <div class="card-body">

                <div class="card-inner-body">
                    <div class="card-title" title="${item.name}">${item.nickname || item.name}</div>
                    <div class="card-quantity">Quantity: ${quantity}</div>
                    <div class="card-footer">
                        ${quantity > 1 
                            ? (unitShip > 0 
                                ? `<div class="price-breakdown">(${getFormattedPrice(unitBase)} + ${getFormattedPrice(unitShip)}) &times; ${quantity}</div>`
                                : `<div class="price-breakdown">${getFormattedPrice(unitBase)} &times; ${quantity}</div>`)
                            : (unitShip > 0 
                                ? `<div class="price-breakdown">${getFormattedPrice(unitBase)} + ${getFormattedPrice(unitShip)}</div>`
                                : '')
                        } 
                        <div class="final-price-row">
                            <div>
                                <div class="total-price-label">Total Price</div>
                                <span class="final-price">${getFormattedPrice(totalCost)}</span>
                            </div>
                            ${shippingHtml}
                        </div>
                    </div>
                    <a href="${item.productLink || '#'}" target="_blank" class="sum-deets">Visit Store</a>
                </div>
            </div>
        `;

        // Mobile: Click to toggle hover state
        card.addEventListener('click', (e) => {
            if (window.innerWidth > 1200) return;

            // Allow links to work without toggling
            if (e.target.closest('a') || e.target.closest('.sum-deets')) return;

            if (card.classList.contains('mobile-hover-state')) {
                card.classList.remove('mobile-hover-state');
            } else {
                // Optional: Close other open cards
                document.querySelectorAll('.summary-card.mobile-hover-state').forEach(c => c.classList.remove('mobile-hover-state'));
                card.classList.add('mobile-hover-state');
            }
        });

        cardWrapper.appendChild(card);
        fragment.appendChild(cardWrapper);
    });            

    // Append all summary cards in a single DOM update
    grid.appendChild(fragment);

    countEl.textContent = items.length;
    // UPDATE TOTALS
    const formattedTotal = getFormattedPrice(grandTotal);
    // Update the Sticky (Dynamic) Total
    if(stickyTotalEl) stickyTotalEl.textContent = formattedTotal;
    if(mobileDynamicEl) mobileDynamicEl.textContent = formattedTotal;
    
    // Start sliders for newly rendered summary cards
    initSliders();

    // Trigger animations for the newly rendered cards
    initSummaryAnimations();
}

/**
 * Returns a filtered and sorted list of inventory items
 * based on current filter and sort state.
 * @returns {Array} Filtered and sorted inventory
 */
function getFilteredAndSortedList() {
    let list = [...inventory];

    // 1. Apply search
    if (searchTerm) {
        list = list.filter(item => item.name.toLowerCase().includes(searchTerm));
    }

    // 2. Apply button filters
    if (currentFilter !== 'all') {
        if (currentFilter === 'essential') {
            list = list.filter(i => i.essentialRank === 1);
        } else if (currentFilter === 'freeShipping') {
            list = list.filter(i => i.shipping === 0);
        } else if (['AliExpress', 'Jumia', 'Temu', 'Local Retail'].includes(currentFilter)) {
            list = list.filter(i => i.source === currentFilter);
        } else {
            list = list.filter(i => i.category === currentFilter);
        }
    }

    // 3. Apply sort
    const getTotalCost = item => (parsePrice(item.basePrice) + parsePrice(item.shipping || 0)) * (item.quantity || 1);
    if (currentSort === 'price-asc') {
        list.sort((a, b) => getTotalCost(a) - getTotalCost(b));
    } else if (currentSort === 'price-desc') {
        list.sort((a, b) => getTotalCost(b) - getTotalCost(a));
    } else if (currentSort === 'essential') {
        list.sort((a, b) => {
        if (a.isEssential && !b.isEssential) return -1;
        if (!a.isEssential && b.isEssential) return 1;
        return (a.essentialRank || 99) - (b.essentialRank || 99);
    });
    }
    
    return list;
}

/**
 * Filters summary to show items matching criteria and re-renders.
 * Also hides navbar and scrolls to summary section.
 * @param {string} criteria - Filter type (e.g., 'essential', 'Learning', 'AliExpress')
 * @param {HTMLElement} btnElement - The filter button clicked (optional)
 */
function filterSummary(criteria, btnElement) {
    currentFilter = criteria;
    if (btnElement) {
        document.querySelectorAll('.filter-button').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }
    const listToRender = getFilteredAndSortedList();
    renderSummary(listToRender);

    // Hide navbar during filter scroll
    const navbar = document.getElementById("navbar");
    const isFilterScroll = true;
    if (navbar) navbar.classList.add("nav-hidden");

    // Reset scroll position of the summary grid
    const utlBar = document.getElementById('stc');
    const grid = document.getElementById('summaryGrid');
    
    if (grid && utlBar) {
        const headerOffset = utlBar.offsetHeight;
        const elementPosition = grid.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }
}

/**
 * Re-renders summary with current sort order applied.
 * Called when sort select dropdown changes.
 */
function sortSummary() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        currentSort = sortSelect.value;
    }
    const listToRender = getFilteredAndSortedList();
    renderSummary(listToRender);
}

/**
 * Initializes image sliders for all summary cards.
 * Sets up auto-scrolling image galleries with manual controls.
 */
function initSliders() {
    // Clear existing intervals to prevent speed-ups
    if (window.sliderIntervals) {
        window.sliderIntervals.forEach(clearInterval);
    }
    window.sliderIntervals = [];

    const tracks = document.querySelectorAll('.slider-track');

    tracks.forEach(track => {
        const images = track.querySelectorAll('img');
        if (images.length <= 1) return;

        let currentIndex = 0;
        
        // Random offset so they don't all slide at exactly the same millisecond
        const randomOffset = Math.floor(Math.random() * 1000);

        setTimeout(() => {
            const intervalId = setInterval(() => {
                currentIndex++;
                if (currentIndex >= images.length) {
                    currentIndex = 0;
                }
                track.style.transform = `translateX(-${currentIndex * 100}%)`;
            }, 3000); 
            window.sliderIntervals.push(intervalId);
        }, randomOffset);
    });
}

// Export for use in script16.js (if using modules in future)
// Currently these are global functions for lazy-loaded initialization

let summaryCardObserver = null;

/**
 * Initializes the scroll-into-view animations for summary cards.
 * Called automatically at the end of renderSummary().
 */
function initSummaryAnimations() {
    const cards = document.querySelectorAll('.summary-card-wrapper');
    if (cards.length === 0) return;

    // Disconnect previous observer to prevent memory leaks or duplicate observations
    if (summaryCardObserver) {
        summaryCardObserver.disconnect();
    }

    const observerOptions = {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.15 // Trigger when 15% of the card is visible
    };

    summaryCardObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Calculate a staggered delay based on the entry order
                const delay = entry.target.dataset.delay || 0;
                
                setTimeout(() => {
                    entry.target.classList.add('in-view');
                }, delay);

                // Stop watching this card once it has animated
                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    cards.forEach((card, index) => {
        let staggerTime = (index % 5) * 100; 
        card.dataset.delay = staggerTime;
        summaryCardObserver.observe(card);
        
        // Fallback: Ensure visibility if observer fails or takes too long
        setTimeout(() => {
            if (!card.classList.contains('in-view')) card.classList.add('in-view');
        }, 1000 + staggerTime);
    });
}