/**
 * Ramsey Solutions Chrome Extension Popup Script
 * Handles user interactions and OpenAI chat integration
 */

// Configuration
const CONFIG = {
    STORAGE_KEY: 'userInput',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
};

// DOM Elements
let elements = {
    userInput: null,
    submitButton: null,
    appLinks: null,
    chatMessages: null,
    appSwitcherView: null,
    chatView: null,
    closeChatButton: null
};

/**
 * Switches between app switcher and chat views
 * @param {boolean} showChat - Whether to show chat view
 */
function switchView(showChat) {
    if (showChat) {
        elements.appSwitcherView.classList.add('hidden');
        elements.chatView.classList.remove('hidden');
    } else {
        elements.chatView.classList.add('hidden');
        elements.appSwitcherView.classList.remove('hidden');
        elements.chatMessages.innerHTML = ''; // Clear chat history
        elements.userInput.value = ''; // Clear input
    }
}

/**
 * Creates and adds a message to the chat container
 * @param {string} text - The message text
 * @param {string} type - Either 'user' or 'assistant'
 */
function addMessage(text, type) {
    if (elements.chatView.classList.contains('hidden')) {
        switchView(true);
    }
    const messageEl = document.createElement('div');
    messageEl.classList.add('message', `${type}-message`);
    messageEl.textContent = text;
    elements.chatMessages.appendChild(messageEl);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

/**
 * Handles the chat with OpenAI
 * @param {string} userInput - The user's message
 */
async function handleChat(userInput) {
    try {
        // Get API key from storage
        const { OPENAI_API_KEY } = await chrome.storage.local.get(['OPENAI_API_KEY']);
        if (!OPENAI_API_KEY) {
            addMessage('Error: OpenAI API key not found. Make sure .env file is present.', 'assistant');
            return;
        }

        // Add user message to chat
        addMessage(userInput, 'user');
        
        // Make API request to OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'user',
                    content: userInput
                }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get response from OpenAI');
        }

        const data = await response.json();
        const assistantResponse = data.choices[0]?.message?.content;
        
        if (assistantResponse) {
            addMessage(assistantResponse, 'assistant');
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
    }
}

/**
 * Handles form submission
 * @param {string} userText - The text input by the user
 */
async function handleSubmission(userText) {
    if (!userText) return;
    
    elements.userInput.value = '';
    adjustTextareaHeight(elements.userInput);
    await handleChat(userText);
}

/**
 * Automatically adjusts textarea height based on content
 * @param {HTMLTextAreaElement} textarea - The textarea element to adjust
 */
function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    const maxHeight = 100;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
}

/**
 * Initializes event listeners for the popup
 */
function initializeEventListeners() {
    elements.submitButton.addEventListener('click', () => {
        const text = elements.userInput.value.trim();
        if (text) {
            handleSubmission(text);
        }
    });

    elements.userInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            elements.submitButton.click();
        }
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
            e.stopPropagation();
        }
    });

    elements.userInput.addEventListener('input', () => {
        adjustTextareaHeight(elements.userInput);
    });

    elements.closeChatButton.addEventListener('click', () => {
        switchView(false);
    });

    elements.appLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const appName = link.querySelector('.app-name').textContent;
            console.log(`App clicked: ${appName}`);
        });
    });
}

/**
 * Initializes the popup
 */
function initializePopup() {
    elements = {
        userInput: document.getElementById('userInput'),
        submitButton: document.getElementById('submitButton'),
        appLinks: document.querySelectorAll('.app-item'),
        chatMessages: document.getElementById('chatMessages'),
        appSwitcherView: document.getElementById('appSwitcherView'),
        chatView: document.getElementById('chatView'),
        closeChatButton: document.getElementById('closeChatButton')
    };

    // Start with chat view hidden and app switcher visible
    elements.chatView.classList.add('hidden');
    elements.appSwitcherView.classList.remove('hidden');

    initializeEventListeners();
    adjustTextareaHeight(elements.userInput);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);
