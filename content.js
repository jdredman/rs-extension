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

// Add font face and animation styles to the page
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @font-face {
        font-family: 'Gibson';
        src: url('https://www.ramseysolutions.com/fonts/canada-type-gibson-regular.woff2') format('woff2');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
    }

    @font-face {
        font-family: 'Gibson';
        src: url('https://www.ramseysolutions.com/fonts/canada-type-gibson-semibold.woff2') format('woff2');
        font-weight: 600;
        font-style: normal;
        font-display: swap;
    }
    @keyframes rotateShadow {
        0% {
        box-shadow: -5px 0 29px -4px rgba(0, 178, 246, 0.95), 5px 0 10px -4px rgba(209, 96, 183, 0.95);
        }
        15% {
            box-shadow: -3px 4px 15px -4px rgba(0, 178, 246, 0.95), 3px -4px 29px -4px rgba(209, 96, 183, 0.75);
        }
        25% {
            box-shadow: 0 5px 29px -4px rgba(0, 178, 246, 0.99), 0 -5px 15px -4px rgba(209, 96, 183, 0.9);
        }
        40% {
            box-shadow: 2px 3px 10px -4px rgba(0, 178, 246, 0.93), -2px -3px 29px -4px rgba(209, 96, 183, 0.7);
        }
        50% {
            box-shadow: 5px 0 29px -4px rgba(0, 178, 246, 0.85), -5px 0 10px -4px rgba(209, 96, 183, 0.85);
        }
        65% {
            box-shadow: 3px -3px 15px -4px rgba(0, 178, 246, 0.95), -3px 3px 29px -4px rgba(209, 96, 183, 0.75);
        }
        75% {
            box-shadow: 0 -5px 29px -4px rgba(0, 178, 246, 0.9), 0 5px 15px -4px rgba(209, 96, 183, 0.9);
        }
        90% {
            box-shadow: -4px -2px 10px -4px rgba(0, 178, 246, 0.93), 4px 2px 29px -4px rgba(209, 96, 183, 0.7);
        }
        100% {
            box-shadow: -5px 0 29px -4px rgba(0, 178, 246, 0.95), 5px 0 10px -4px rgba(209, 96, 183, 0.95);
        }
    }

    @keyframes rotateGradient {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
    }
`;
document.head.appendChild(styleSheet);

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
        // Create container for icon and warning
        const containerEl = document.createElement('div');
        containerEl.className = 'rs-budget-warning-container';
        
        // Create wrapper for animation
        const wrapperEl = document.createElement('div');
        wrapperEl.style.cssText = `
            position: fixed;
            top: 16px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            padding: 3px;
            border-radius: 35px;
            background: linear-gradient(145deg, 
                #00b2f6,
                rgba(0, 178, 246, 1),
                #d160b7,
                rgba(209, 96, 183, 1),
                #00b2f6,
                rgba(0, 178, 246, 1),
                #d160b7,
                rgba(209, 96, 183, 1),
                #00b2f6
            );
            background-size: 400% 100%;
            animation: rotateShadow 15s ease-in-out infinite, rotateGradient 20s linear infinite;
        `;

        // Create inner container with background
        containerEl.style.cssText = `
            position: relative;
            display: flex;
            align-items: center;
            background-color: #ffffff;
            padding: 12px 48px 12px 16px;
            border-radius: 32px;
            gap: 12px;
            z-index: 1;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        // Create icon element
        const iconEl = document.createElement('img');
        iconEl.className = 'rs-budget-warning-icon';
        iconEl.src = chrome.runtime.getURL('images/icon48.png');
        iconEl.style.cssText = `
            display: block;
            width: 32px;
            height: 32px;
        `;

        // Create warning message element
        const warningEl = document.createElement('div');
        warningEl.className = 'rs-budget-warning';
        warningEl.innerHTML = '<span style="font-family: Gibson, sans-serif; font-weight: 600;">Budget Alert:</span> You do not have enough left in your budget category for items on this page. <a href="https://www.everydollar.com/app/budget" target="_blank">Manage in EveryDollar</a>';
        warningEl.style.cssText = `
            color: #333;
            font-size: 0.9em;
            font-weight: normal;
            line-height: 1.4;
            font-family: 'Gibson', sans-serif;
        `;            // Style the link
            const linkEl = warningEl.querySelector('a');
            if (linkEl) {
                linkEl.style.cssText = `
                    color: #0084c1;
                    text-decoration: underline;
                    font-weight: normal;
                `;
        }

        // Create close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: none;
            border: none;
            color: #666;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            &:hover {
                background-color: #f0f0f0;
            }
        `;
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
