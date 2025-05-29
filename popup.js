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
