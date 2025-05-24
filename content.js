// This script runs on the labs.ramseysolutions.com page
chrome.storage.local.get(['userInput'], function(result) {
    if (result.userInput) {
        // Function to find and fill the input field
        function fillInputAndSubmit() {
            const input = document.querySelector('.v-field__input');
            const submitButton = document.querySelector('button[type="submit"].v-btn--icon');
            
            if (input && submitButton) {
                // Fill the input and trigger necessary events
                input.value = result.userInput;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Wait a brief moment for Vue to process the input
                setTimeout(() => {
                    // Trigger click events on the submit button
                    submitButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                    submitButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                    
                    // Clear the stored input after submission
                    chrome.storage.local.remove('userInput');
                }, 500);
            } else {
                // If elements aren't found yet, try again
                setTimeout(fillInputAndSubmit, 1000);
            }
        }

        // Start the process with a delay to ensure Vue is fully initialized
        setTimeout(() => {
            if (document.readyState === 'complete') {
                fillInputAndSubmit();
            } else {
                window.addEventListener('load', fillInputAndSubmit);
            }
        }, 2000);
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
            box-shadow: -5px 0 29px -4px rgba(0, 178, 246, 0.9), 5px 0 29px -4px rgba(209, 96, 183, 0.9);
        }
        25% {
            box-shadow: 0 5px 29px -4px rgba(0, 178, 246, 0.9), 0 -5px 29px -4px rgba(209, 96, 183, 0.9);
        }
        50% {
            box-shadow: 5px 0 29px -4px rgba(0, 178, 246, 0.9), -5px 0 29px -4px rgba(209, 96, 183, 0.9);
        }
        75% {
            box-shadow: 0 -5px 29px -4px rgba(0, 178, 246, 0.9), 0 5px 29px -4px rgba(209, 96, 183, 0.9);
        }
        100% {
            box-shadow: -5px 0 29px -4px rgba(0, 178, 246, 0.9), 5px 0 29px -4px rgba(209, 96, 183, 0.9);
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
                rgba(0, 178, 246, 0.7),
                #d160b7,
                rgba(209, 96, 183, 0.7),
                #00b2f6,
                rgba(0, 178, 246, 0.7),
                #d160b7,
                rgba(209, 96, 183, 0.7),
                #00b2f6
            );
            background-size: 400% 100%;
            animation: rotateShadow 30s ease-in-out infinite, rotateGradient 30s linear infinite;
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
