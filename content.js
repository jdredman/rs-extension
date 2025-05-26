/**
 * Content script for Ramsey Solutions Chrome Extension
 * Handles interaction with the labs.ramseysolutions.com page
 */

// Configuration
const CONFIG = {
    STORAGE_KEY: 'userInput',
    SELECTORS: {
        input: '.v-field__input',
        submitButton: 'button[type="submit"].v-btn--icon'
    },
    DELAYS: {
        vueInit: 2000,
        retryInterval: 1000,
        eventDelay: 500
    }
};

/**
 * Simulates user interaction with form elements
 * @param {HTMLElement} input - The input field element
 * @param {HTMLElement} submitButton - The submit button element
 * @param {string} inputValue - The value to input
 */
function simulateUserInteraction(input, submitButton, inputValue) {
    // Fill input and trigger events
    input.value = inputValue;
    ['input', 'change'].forEach(eventType => {
        input.dispatchEvent(new Event(eventType, { bubbles: true }));
    });
    
    // Simulate button click with slight delay for Vue
    setTimeout(() => {
        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
            submitButton.dispatchEvent(new MouseEvent(eventType, { bubbles: true }));
        });
        
        // Clear stored input
        chrome.storage.local.remove(CONFIG.STORAGE_KEY);
    }, CONFIG.DELAYS.eventDelay);
}

/**
 * Attempts to find and fill the input field
 * @param {string} userInput - The text to input
 */
function fillInputAndSubmit(userInput) {
    const input = document.querySelector(CONFIG.SELECTORS.input);
    const submitButton = document.querySelector(CONFIG.SELECTORS.submitButton);
    
    if (input && submitButton) {
        simulateUserInteraction(input, submitButton, userInput);
    } else {
        // Retry if elements aren't found
        setTimeout(() => fillInputAndSubmit(userInput), CONFIG.DELAYS.retryInterval);
    }
}

// Initialize content script
chrome.storage.local.get([CONFIG.STORAGE_KEY], function(result) {
    if (result[CONFIG.STORAGE_KEY]) {
        // Wait for Vue to initialize
        setTimeout(() => {
            if (document.readyState === 'complete') {
                fillInputAndSubmit(result[CONFIG.STORAGE_KEY]);
            } else {
                window.addEventListener('load', () => fillInputAndSubmit(result[CONFIG.STORAGE_KEY]));
            }
        }, CONFIG.DELAYS.vueInit);
    }
});

// Inject external stylesheet
const linkElement = document.createElement('link');
linkElement.rel = 'stylesheet';
linkElement.href = chrome.runtime.getURL('content-styles.css');
document.head.appendChild(linkElement);

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

// Run the budget check when the page loads and when content changes
document.addEventListener('DOMContentLoaded', addBudgetWarnings);

// Use a MutationObserver to detect dynamically loaded content
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            addBudgetWarnings();
        }
    }
});

// Start observing changes to the DOM
observer.observe(document.body, {
    childList: true,
    subtree: true
});
