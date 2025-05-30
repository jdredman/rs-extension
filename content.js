/**
 * Content script for Ramsey Solutions Chrome Extension
 * Handles interaction with web pages and context collection
 */

const CONFIG = {
    PAGE_CONTEXT_KEY: 'pageContext',
    BUDGET_WARNING_KEY: 'budgetWarning',
    CREDIT_CARD_WARNING_KEY: 'creditCardWarning',
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
    },
    WARNING_TRIGGERS: {
        budget: ['cart', 'shopping cart', 'checkout', 'add to cart', 'buy now', 'purchase', 'order total', 'subtotal', 'product page', 'item details', 'buy', 'order now', 'add to bag'],
        creditCard: ['credit card']
    }
};

/**
 * Extracts and stores page context
 */
function extractAndStoreContext() {
    const context = {
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        content: {},
        metadata: {}
    };

    // Get main content with structure
    let contentSections = {};
    CONFIG.SELECTORS.content.forEach(selector => {
        const elements = Array.from(document.querySelectorAll(selector));
        elements.forEach(el => {
            const text = el.textContent.trim();
            if (text) {
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

    // Get additional metadata
    context.metadata = {
        description: document.querySelector('meta[name="description"]')?.content,
        keywords: document.querySelector('meta[name="keywords"]')?.content,
        author: document.querySelector('meta[name="author"]')?.content
    };

    // Create structured content
    context.content = {
        ...contentSections,
        summary: contentSections.mainContent?.join(' ').slice(0, 2000)
    };

    // Store context immediately
    chrome.storage.local.set({
        pageContext: context,
        lastUpdated: Date.now()
    });

    // Check for warnings after context is extracted
    checkForWarnings(context);

    return context;
}

/**
 * Checks page content for budget and credit card mentions and displays warnings
 */
function checkForWarnings(context) {
    const currentUrl = window.location.href.toLowerCase();
    const currentPath = window.location.pathname.toLowerCase();
    
    // Don't show warnings on Ramsey Solutions websites
    if (currentUrl.includes('ramseysolutions.com') || 
        currentUrl.includes('everydollar.com') || 
        currentUrl.includes('daveramsey.com')) {
        return;
    }
    
    // Only check for budget warnings on shopping cart URLs
    const shoppingCartUrlIndicators = [
        '/cart', '/checkout', '/basket', '/bag', '/purchase', 
        '/shop', '/store', '/product', '/item', '/order'
    ];
    
    const isShoppingCartPage = shoppingCartUrlIndicators.some(indicator => 
        currentUrl.includes(indicator) || currentPath.includes(indicator)
    );
    
    if (isShoppingCartPage) {
        // Check for budget-related content only on shopping pages
        const pageText = document.body.textContent.toLowerCase();
        const budgetDetected = CONFIG.WARNING_TRIGGERS.budget.some(trigger => 
            pageText.includes(trigger.toLowerCase())
        );
        
        if (budgetDetected) {
            showBudgetWarning();
        }
    }
    
    // Check for credit card mentions (can appear on any page with payment forms)
    const pageText = document.body.textContent.toLowerCase();
    const creditCardDetected = CONFIG.WARNING_TRIGGERS.creditCard.some(trigger => 
        pageText.includes(trigger.toLowerCase())
    );
    
    if (creditCardDetected) {
        showCreditCardWarning();
    }
}

// Session storage for dismissed warnings (resets on page refresh)
const sessionDismissed = {
    budget: false,
    creditCard: false
};

/**
 * Displays budget warning message
 */
function showBudgetWarning() {
    // Check if warning is already shown or dismissed this session
    if (document.querySelector('.rs-budget-warning-wrapper') || sessionDismissed.budget) {
        return;
    }
    
    createWarningElement('budget');
}

/**
 * Displays credit card warning message
 */
function showCreditCardWarning() {
    // Check if warning is already shown or dismissed this session
    if (document.querySelector('.rs-credit-card-warning-wrapper') || sessionDismissed.creditCard) {
        return;
    }
    
    createWarningElement('creditCard');
}

/**
 * Creates and displays warning element
 */
function createWarningElement(type) {
    const warnings = {
        budget: {
            title: " Not enough in your budget!",
            message: "You don't have enough allocated in your budget category for this purchase. Stick to your budget to stay on track.",
            link: "https://www.everydollar.com/app/budget",
            linkText: "Update Budget",
            icon: "💰",
            className: "rs-budget-warning-wrapper"
        },
        creditCard: {
            title: " Avoid the credit card trap!",
            message: "Dave Ramsey teaches cash is king. Use your debit card or cash instead of credit cards.",
            link: "https://www.ramseysolutions.com/debt/how-many-credit-cards-should-you-have",
            linkText: "Learn Why",
            icon: "⚠️",
            className: "rs-credit-card-warning-wrapper"
        }
    };
    
    const config = warnings[type];
    if (!config) return;
    
    // Create warning wrapper
    const warningWrapper = document.createElement('div');
    warningWrapper.className = config.className;
    
    // Create warning container
    const warningContainer = document.createElement('div');
    const baseClass = type === 'budget' ? 'rs-budget-warning' : 'rs-credit-card-warning';
    warningContainer.className = `${baseClass}-container`;
    
    warningContainer.innerHTML = `
        <img class="${baseClass}-icon" src="${chrome.runtime.getURL('images/icon48.png')}" alt="Ramsey Solutions" />
        <div class="${baseClass}">
            <div class="${baseClass}-title">${config.icon} ${config.title}</div>
            <div>${config.message} <a href="${config.link}" target="_blank">${config.linkText}</a></div>
        </div>
        <button class="${baseClass}-close" data-warning-type="${type}">&times;</button>
    `;
    
    warningWrapper.appendChild(warningContainer);
    
    // Add event listener for close button
    const closeButton = warningContainer.querySelector(`.${baseClass}-close`);
    closeButton.addEventListener('click', () => {
        dismissWarning(type, warningWrapper);
    });
    
    // Create or get warnings container for stacking
    let warningsContainer = document.querySelector('.rs-warnings-container');
    if (!warningsContainer) {
        warningsContainer = document.createElement('div');
        warningsContainer.className = 'rs-warnings-container';
        document.body.appendChild(warningsContainer);
    }
    
    // Add warning to container
    warningsContainer.appendChild(warningWrapper);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (warningsContainer.contains(warningWrapper)) {
            dismissWarning(type, warningWrapper);
        }
    }, 10000);
}

/**
 * Dismisses warning and marks as dismissed for this session
 */
function dismissWarning(type, element) {
    if (element) {
        element.remove();
    }
    
    // Mark as dismissed for this session
    sessionDismissed[type] = true;
    
    // Clean up warnings container if empty
    const warningsContainer = document.querySelector('.rs-warnings-container');
    if (warningsContainer && warningsContainer.children.length === 0) {
        warningsContainer.remove();
    }
}

// Handle messages from popup and background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageContext') {
        const context = extractAndStoreContext();
        sendResponse(context);
    }
    return true;
});

// Update context when DOM changes
const observer = new MutationObserver((mutations) => {
    if (mutations.some(m => 
        m.type === 'childList' || 
        m.type === 'characterData' ||
        (m.type === 'attributes' && m.target.tagName === 'TITLE')
    )) {
        extractAndStoreContext();
    }
});

// Initialize content script
function initialize() {
    // Extract initial context
    extractAndStoreContext();

    // Start observing DOM changes
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['content', 'title']
    });
}

// Start initialization
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
