/**
 * Content script for Ramsey Solutions Chrome Extension
 * Handles interaction with web pages and context collection
 */

const CONFIG = {
    PAGE_CONTEXT_KEY: 'pageContext',
    BUDGET_WARNING_KEY: 'budgetWarning',
    SELECTORS: {
        content: [
            'h1',
            'h2',
            'h3',
            'article',
            'main',
            '[role="main"]',
            '.main-content',
            '.article-content',
            'meta[name="description"]'
        ]
    }
};

/**
 * Extracts relevant content from the page
 * @returns {Object} Page context information
 */
function extractPageContext() {
    const context = {
        url: window.location.href,
        title: document.title,
        content: '',
        metadata: {}
    };

    // Get meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        context.metadata.description = metaDesc.getAttribute('content');
    }

    // Get main content with structure
    let contentSections = {};
    CONFIG.SELECTORS.content.forEach(selector => {
        const elements = Array.from(document.querySelectorAll(selector));
        elements.forEach(el => {
            const text = el.textContent.trim();
            if (text) {
                // Categorize content by type
                if (el.tagName === 'H1') contentSections.mainHeading = text;
                else if (el.tagName === 'H2' || el.tagName === 'H3') {
                    if (!contentSections.subHeadings) contentSections.subHeadings = [];
                    contentSections.subHeadings.push(text);
                }
                else if (el.tagName === 'ARTICLE' || el.tagName === 'MAIN') {
                    if (!contentSections.mainContent) contentSections.mainContent = [];
                    contentSections.mainContent.push(text);
                }
            }
        });
    });

    // Get additional context
    const links = Array.from(document.querySelectorAll('a'))
        .map(a => ({ text: a.textContent.trim(), href: a.href }))
        .filter(link => link.text && !link.text.includes('http'));

    // Combine metadata
    context.metadata = {
        ...context.metadata,
        keywords: document.querySelector('meta[name="keywords"]')?.content,
        author: document.querySelector('meta[name="author"]')?.content,
        links: links.slice(0, 5) // Include first 5 relevant links
    };

    // Create structured content
    context.content = {
        ...contentSections,
        summary: contentSections.mainContent?.join(' ').slice(0, 2000) // First 2000 chars of main content
    };

    return context;
}

/**
 * Stores the current page context
 */
function storePageContext() {
    const context = extractPageContext();
    chrome.storage.local.set({ [CONFIG.PAGE_CONTEXT_KEY]: context });
}

// Price detection and budget warning functionality
function addBudgetWarnings() {
    // Common price selectors used by various e-commerce sites
    const priceSelectors = [
        // Standard price classes
        '.price',
        '[data-price]',
        '.product-price',
        '.regular-price',
        'span[itemprop="price"]',
        '.amount',
        '.current-price',
        '.sales-price',
        '.product__price',
        '.money',
        
        // E-commerce platform specific
        // Shopify
        '.price__regular',
        '.price__sale',
        '.price-item',
        // WooCommerce
        '.woocommerce-Price-amount',
        // Common retail sites
        '[data-automation-id="product-price"]',
        '[data-test-id*="price"]',
        '[data-testid*="price"]',
        '.pd-price',
        '.product-price-amount',
        '.product-price-value',
        '.product-price__retail',
        '.product-price__sale',
        '.product-price--pdp',
        '.product-price--list',
        '.product-price--sale',
        // Generic attributes
        '[class*="price"]',
        '[id*="price"]',
        '[data-component*="price"]',
        '[data-name*="price"]',
        '[aria-label*="price"]',
        '[data-analytics-value]'
    ];

    // Check if we already added the warning to this page
    if (document.querySelector('.rs-budget-warning-container')) {
        return;
    }

    // First try direct price selectors
    let priceElements = document.querySelectorAll(priceSelectors.join(','));
    
    // If no prices found, try finding currency symbols
    if (priceElements.length === 0) {
        const currencyRegex = /(?:USD|US|\$|£|€)\s*\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s*(?:USD|US|\$|£|€)/i;
        const textNodes = [];
        const walk = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    return currencyRegex.test(node.nodeValue)
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_REJECT;
                }
            }
        );

        while (walk.nextNode()) {
            textNodes.push(walk.currentNode.parentElement);
        }
        
        priceElements = new Set(textNodes);
    }
    
    if (priceElements.length > 0) {
        // Create wrapper for animation
        const wrapperEl = document.createElement('div');
        wrapperEl.className = 'rs-budget-warning-wrapper';

        // Create container for icon and warning
        const containerEl = document.createElement('div');
        containerEl.className = 'rs-budget-warning-container';

        // Create icon element
        const iconEl = document.createElement('img');
        iconEl.className = 'rs-budget-warning-icon';
        iconEl.src = chrome.runtime.getURL('images/icon128.png');

        // Create warning message element
        const warningEl = document.createElement('div');
        warningEl.className = 'rs-budget-warning';
        warningEl.innerHTML = '<span class="rs-budget-warning-title">Budget Alert:</span> You do not have enough left in your budget category for items on this page. <br/><a href="https://www.everydollar.com/app/budget" target="_blank">Manage in EveryDollar</a>';

        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = 'rs-budget-warning-close';
        closeButton.innerHTML = '×';
        closeButton.onclick = () => wrapperEl.remove();

        // Add elements to container and wrapper, then insert at top of body
        containerEl.appendChild(iconEl);
        containerEl.appendChild(warningEl);
        containerEl.appendChild(closeButton);
        wrapperEl.appendChild(containerEl);
        document.body.appendChild(wrapperEl);
    }
}

// Initialize functionality
function initialize() {
    // Store initial page context
    storePageContext();
    
    // Add budget warnings
    addBudgetWarnings();

    // Observe DOM changes for context updates
    const contextObserver = new MutationObserver((mutations) => {
        if (mutations.some(mutation => mutation.addedNodes.length > 0)) {
            storePageContext();
        }
    });

    // Start observing changes to the DOM
    contextObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Initialize when the page is ready
if (document.readyState === 'complete') {
    initialize();
} else {
    window.addEventListener('load', initialize);
}

// Inject external stylesheet
const linkElement = document.createElement('link');
linkElement.rel = 'stylesheet';
linkElement.href = chrome.runtime.getURL('content-styles.css');
document.head.appendChild(linkElement);
