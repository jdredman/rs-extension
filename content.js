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

    return context;
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
