/**
 * Ramsey Solutions Chrome Extension Popup Script
 * Handles user interactions in the extension popup
 */

// Configuration
const CONFIG = {
    LABS_URL: 'https://labs.ramseysolutions.com/rp1/home',
    STORAGE_KEY: 'userInput'
};

// DOM Elements
let elements = {
    userInput: null,
    submitButton: null,
    appLinks: null
};

/**
 * Handles form submission
 * @param {string} userText - The text input by the user
 */
function handleSubmission(userText) {
    if (!userText) return;
    
    chrome.storage.local.set({ [CONFIG.STORAGE_KEY]: userText }, () => {
        chrome.tabs.create({ url: CONFIG.LABS_URL }, () => {
            window.close();
        });
    });
}

/**
 * Initializes event listeners for the popup
 */
function initializeEventListeners() {
    // Submit button click handler
    elements.submitButton.addEventListener('click', () => {
        handleSubmission(elements.userInput.value.trim());
    });

    // Keyboard shortcut handler (Ctrl/Cmd + Enter)
    elements.userInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            elements.submitButton.click();
        }
    });

    // App switcher analytics
    elements.appLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const appName = link.querySelector('.app-name').textContent;
            console.log(`App clicked: ${appName}`);
            // Add analytics here if needed
        });
    });
}

/**
 * Initializes the popup
 */
function initializePopup() {
    // Cache DOM elements
    elements = {
        userInput: document.getElementById('userInput'),
        submitButton: document.getElementById('submitButton'),
        appLinks: document.querySelectorAll('.app-item')
    };

    initializeEventListeners();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);
