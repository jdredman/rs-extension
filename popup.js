/**
 * Ramsey Solutions Chrome Extension Popup Script
 * Handles user interactions and OpenAI chat integration
 */

// Configuration
const CONFIG = {
    STORAGE_KEY: 'userInput',
    CONVERSATIONS_KEY: 'conversationHistory',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    MAX_CONVERSATIONS: 50
};

// DOM Elements
let elements = {
    userInput: null,
    submitButton: null,
    appLinks: null,
    chatMessages: null,
    appSwitcherView: null,
    chatView: null,
    historyView: null,
    headerButton: null,
    headerButtonIcon: null,
    historyList: null
};

// Current conversation state
let currentConversation = {
    id: null,
    messages: [],
    createdAt: null
};

/**
 * Gets the current tab's context
 */
async function getCurrentTabContext() {
    try {
        const [tab] = await chrome.tabs.query({ 
            active: true, 
            currentWindow: true,
            status: 'complete'
        });

        if (!tab) return null;

        // Request fresh context from content script
        const context = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, { action: 'getPageContext' }, (response) => {
                resolve(response);
            });
        });
        
        if (!context) {
            throw new Error('No context received from content script');
        }

        return context;
    } catch (error) {
        console.error('Error getting page context:', error);
        return null;
    }
}

/**
 * Conversation History Management
 */
async function saveConversation() {
    if (currentConversation.messages.length === 0) return;
    
    try {
        const { [CONFIG.CONVERSATIONS_KEY]: conversations = [] } = await chrome.storage.local.get([CONFIG.CONVERSATIONS_KEY]);
        
        const conversationToSave = {
            id: currentConversation.id || Date.now().toString(),
            messages: [...currentConversation.messages],
            createdAt: currentConversation.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preview: getConversationPreview(currentConversation.messages)
        };
        
        // Remove existing conversation with same ID if updating
        const filteredConversations = conversations.filter(conv => conv.id !== conversationToSave.id);
        
        // Add new conversation at the beginning
        filteredConversations.unshift(conversationToSave);
        
        // Keep only the most recent conversations
        const trimmedConversations = filteredConversations.slice(0, CONFIG.MAX_CONVERSATIONS);
        
        await chrome.storage.local.set({ [CONFIG.CONVERSATIONS_KEY]: trimmedConversations });
        
        // Update current conversation
        currentConversation.id = conversationToSave.id;
        currentConversation.createdAt = conversationToSave.createdAt;
        
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}

async function loadConversations() {
    try {
        const { [CONFIG.CONVERSATIONS_KEY]: conversations = [] } = await chrome.storage.local.get([CONFIG.CONVERSATIONS_KEY]);
        return conversations;
    } catch (error) {
        console.error('Error loading conversations:', error);
        return [];
    }
}

async function deleteConversation(conversationId) {
    try {
        const conversations = await loadConversations();
        const filteredConversations = conversations.filter(conv => conv.id !== conversationId);
        await chrome.storage.local.set({ [CONFIG.CONVERSATIONS_KEY]: filteredConversations });
        renderHistoryList();
    } catch (error) {
        console.error('Error deleting conversation:', error);
    }
}

function getConversationPreview(messages) {
    const userMessage = messages.find(msg => msg.type === 'user');
    return userMessage ? userMessage.text.substring(0, 100) + (userMessage.text.length > 100 ? '...' : '') : 'New conversation';
}

function startNewConversation() {
    currentConversation = {
        id: null,
        messages: [],
        createdAt: null
    };
    elements.chatMessages.innerHTML = '';
}

async function loadConversation(conversationId) {
    try {
        const conversations = await loadConversations();
        const conversation = conversations.find(conv => conv.id === conversationId);
        
        if (conversation) {
            currentConversation = {
                id: conversation.id,
                messages: [...conversation.messages],
                createdAt: conversation.createdAt
            };
            
            // Render messages
            elements.chatMessages.innerHTML = '';
            conversation.messages.forEach(msg => {
                addMessageToDOM(msg.text, msg.type);
            });
            
            // Switch to chat view
            switchView('chat');
        }
    } catch (error) {
        console.error('Error loading conversation:', error);
    }
}

async function renderHistoryList() {
    const conversations = await loadConversations();
    
    if (conversations.length === 0) {
        elements.historyList.innerHTML = '<div class="history-empty">No conversations yet. Start chatting to build your history!</div>';
        return;
    }
    
    elements.historyList.innerHTML = conversations.map(conv => `
        <div class="history-item" data-conversation-id="${conv.id}">
            <div class="history-item-header">
                <span class="history-item-date">${formatDate(conv.createdAt)}</span>
                <button class="history-item-delete" onclick="deleteConversation('${conv.id}')" title="Delete conversation">
                    ×
                </button>
            </div>
            <div class="history-item-preview">${conv.preview}</div>
        </div>
    `).join('');
    
    // Add click listeners to conversation items
    elements.historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('history-item-delete')) {
                const conversationId = item.dataset.conversationId;
                loadConversation(conversationId);
            }
        });
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Today';
    } else if (diffDays === 2) {
        return 'Yesterday';
    } else if (diffDays <= 7) {
        return `${diffDays - 1} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

/**
 * Updates the header button based on current view
 * @param {string} view - 'switcher', 'chat', or 'history'
 */
function updateHeaderButton(view) {
    if (view === 'switcher') {
        elements.headerButtonIcon.src = 'images/history-icon.svg';
        elements.headerButtonIcon.alt = 'History';
        elements.headerButton.title = 'Conversation History';
    } else {
        // Show close button for chat and history views
        elements.headerButtonIcon.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666666"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
        elements.headerButtonIcon.alt = 'Close';
        elements.headerButton.title = 'Close';
    }
}

/**
 * Switches between app switcher, chat, and history views
 * @param {string} view - 'switcher', 'chat', or 'history'
 */
function switchView(view) {
    // Hide all views
    elements.appSwitcherView.classList.add('hidden');
    elements.chatView.classList.add('hidden');
    elements.historyView.classList.add('hidden');
    
    // Update header button
    updateHeaderButton(view);
    
    switch (view) {
        case 'chat':
            elements.chatView.classList.remove('hidden');
            break;
        case 'history':
            elements.historyView.classList.remove('hidden');
            renderHistoryList();
            break;
        case 'switcher':
        default:
            elements.appSwitcherView.classList.remove('hidden');
            // Save conversation when leaving chat
            if (currentConversation.messages.length > 0) {
                saveConversation();
            }
            startNewConversation();
            break;
    }
}

/**
 * Creates and adds a message to the chat container
 * @param {string} text - The message text
 * @param {string} type - Either 'user' or 'assistant'
 */
function addMessage(text, type) {
    if (elements.chatView.classList.contains('hidden')) {
        switchView('chat');
    }
    
    // Start new conversation if needed
    if (!currentConversation.createdAt) {
        currentConversation.createdAt = new Date().toISOString();
    }
    
    // Add to current conversation
    currentConversation.messages.push({ text, type });
    
    // Add to DOM
    addMessageToDOM(text, type);
    
    // Auto-save conversation
    saveConversation();
}

/**
 * Adds a message to the DOM without affecting conversation state
 * @param {string} text - The message text
 * @param {string} type - Either 'user' or 'assistant'
 */
function addMessageToDOM(text, type) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('message', `${type}-message`);
    
    if (type === 'assistant') {
        // Process markdown-like formatting for assistant messages
        const formattedText = formatAssistantMessage(text);
        messageEl.innerHTML = formattedText;
    } else {
        // Keep user messages as plain text
        messageEl.textContent = text;
    }
    
    elements.chatMessages.appendChild(messageEl);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

/**
 * Formats assistant messages with basic markdown-like formatting
 * @param {string} text - The raw text to format
 * @returns {string} - HTML formatted text
 */
function formatAssistantMessage(text) {
    // Escape HTML to prevent XSS
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Apply basic markdown formatting
    formatted = formatted
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        // Inline code
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    // Handle lists
    formatted = formatted.replace(/^- (.*$)/gim, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    formatted = formatted.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
    
    // Wrap in paragraphs if not already wrapped
    if (!formatted.includes('<p>') && !formatted.includes('<ul>') && !formatted.includes('<ol>')) {
        formatted = '<p>' + formatted + '</p>';
    }
    
    return formatted;
}

/**
 * Handles the chat with OpenAI
 */
async function handleChat(userInput) {
    try {
        // Get fresh context
        const context = await getCurrentTabContext();
        
        // Add user message to chat
        addMessage(userInput, 'user');
        
        // Check if user's question seems to relate to current page content
        const isPageRelevant = context && (
            userInput.toLowerCase().includes('this page') ||
            userInput.toLowerCase().includes('this article') ||
            userInput.toLowerCase().includes('current page') ||
            userInput.toLowerCase().includes('what i\'m reading') ||
            userInput.toLowerCase().includes('here') ||
            userInput.toLowerCase().includes('this content') ||
            (context.content.summary && 
                context.content.summary.toLowerCase().split(' ').some(word => 
                    userInput.toLowerCase().includes(word) && word.length > 4
                )
            )
        );

        // Format context for OpenAI only if relevant
        let contextDescription = '';
        if (isPageRelevant && context) {
            contextDescription = `
Current page context (user is asking about this content):
URL: ${context.url}
Title: ${context.title}

${context.content.mainHeading ? `Main Topic: ${context.content.mainHeading}` : ''}
${context.content.subHeadings ? `Key Points:\n${context.content.subHeadings.map(h => `- ${h}`).join('\n')}` : ''}

Article Content:
${context.content.summary || ''}

${context.metadata.keywords ? `Keywords: ${context.metadata.keywords}` : ''}
${context.metadata.author ? `Author: ${context.metadata.author}` : ''}
`;
        }
        // Construct system message with Ramsey-specific instructions
        const systemMessage = `I am an official representative of Ramsey Solutions. I speak and advise as part of our team, giving guidance that is 100% aligned with our financial principles, teachings, and tone. I follow our 7 Baby Steps, encourage debt freedom, promote zero-based budgeting, and always speak with the confidence and clarity of a Ramsey Personality.

I do not present alternative financial philosophies. I never recommend debt, credit cards, loans, or anything that contradicts our principles. Our method is the only and best option. I focus on behavior change and practical next steps, not financial theory.

When helpful to the user, I include or link to trusted resources from these official sources ONLY:
- https://www.ramseysolutions.com
- https://labs.ramseysolutions.com/rp1/community
- The YouTube playlist: https://www.youtube.com/playlist?list=PLN4yoAI6teRO_2ofccBr5IyP1xDra-h91
- Our official tools and products like EveryDollar, FPU, SmartTax, and Ramsey Trusted Pros

I use web search ONLY to retrieve real, up-to-date content from these trusted domains. I DO NOT generate or hallucinate URLs. I only return links that verifiably exist.

When returning a link, I include a metadata preview with:
- The page title
- A short description
- The site favicon (if available)

I make responses conversational, actionable, and appropriately brief—just enough to be genuinely helpful. I am a guide, not just an answer box.

My job is to help users take control of their money through our proven plan—and nothing else.

Always provide advice that aligns with our values and teachings as an official team member.`;

        // Get API key from storage
        const { OPENAI_API_KEY } = await chrome.storage.local.get(['OPENAI_API_KEY']);
        if (!OPENAI_API_KEY) {
            addMessage('Error: OpenAI API key not found.', 'assistant');
            return;
        }

        // Build messages array
        const messages = [
            {
                role: 'system',
                content: systemMessage
            }
        ];

        // Add context as a separate system message only if relevant
        if (contextDescription) {
            messages.push({
                role: 'system',
                content: `Here is the current page context that the user is asking about:\n${contextDescription}`
            });
        }

        // Add user message
        messages.push({
            role: 'user',
            content: contextDescription ? 
                `Based on the current page content, ${userInput}` : 
                userInput
        });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: messages,
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
        console.error('Chat error:', error);
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

    // Header button handles both history and close functionality
    elements.headerButton.addEventListener('click', () => {
        const currentView = getCurrentView();
        if (currentView === 'switcher') {
            switchView('history');
        } else {
            switchView('switcher');
        }
    });

    elements.appLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const appName = link.querySelector('.app-name').textContent;
            console.log(`App clicked: ${appName}`);
        });
    });
}

/**
 * Gets the current active view
 * @returns {string} - 'switcher', 'chat', or 'history'
 */
function getCurrentView() {
    if (!elements.appSwitcherView.classList.contains('hidden')) {
        return 'switcher';
    } else if (!elements.chatView.classList.contains('hidden')) {
        return 'chat';
    } else if (!elements.historyView.classList.contains('hidden')) {
        return 'history';
    }
    return 'switcher';
}

// Make deleteConversation available globally for onclick handlers
window.deleteConversation = deleteConversation;

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
        historyView: document.getElementById('historyView'),
        headerButton: document.getElementById('headerButton'),
        headerButtonIcon: document.getElementById('headerButtonIcon'),
        historyList: document.getElementById('historyList')
    };

    // Start with app switcher view
    switchView('switcher');

    initializeEventListeners();
    adjustTextareaHeight(elements.userInput);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);
