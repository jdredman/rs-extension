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
    MAX_CONVERSATIONS: 50,
    MAX_HISTORY_MESSAGES: 10, // Limit conversation history to prevent context overflow
    // Trusted domains for web search
    TRUSTED_DOMAINS: [
        'ramseysolutions.com',
        'labs.ramseysolutions.com',
        'youtube.com',
        'youtu.be'
    ],
    // YouTube playlist ID for Ramsey content
    RAMSEY_YOUTUBE_PLAYLIST: 'PLN4yoAI6teRO_2ofccBr5IyP1xDra-h91',
    
    // Google Custom Search API configuration
    GOOGLE_SEARCH_API_KEY: null, // Will be loaded from storage
    GOOGLE_SEARCH_ENGINE_ID: null, // Will be loaded from storage
    
    // Search result limits
    MAX_SEARCH_RESULTS: 5,
    MAX_YOUTUBE_RESULTS: 3
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
    historyList: null,
    videoSection: null,
    videoCarouselTrack: null,
    carouselPrev: null,
    carouselNext: null
};

// Current conversation state
let currentConversation = {
    id: null,
    messages: [],
    createdAt: null
};

// Flag to prevent auto-save when just viewing conversations
let isViewingOnly = false;

// Video carousel state
let videoCarousel = {
    videos: [],
    currentIndex: 0,
    itemsVisible: 3, // Default, will be calculated dynamically
    containerWidth: 0,
    itemWidth: 0,
    gap: 12
};

// Static video data
const RAMSEY_VIDEOS = [
    {
        id: 'ramsey1',
        title: 'Stop Comparing Yourself to Others and Focus on Your Own Journey',
        thumbnail: 'https://cdn.ramseysolutions.net/static-assets/b2c/shows/trs/20250507-H2S2-ccf0f3a2-c896-465f-8a57-89d7230f6a5c.0000004.jpg',
        url: 'https://labs.ramseysolutions.com/rp1/calls/a879b3ef-788c-497e-9796-8a5d0a284bb5'
    },
    {
        id: 'ramsey2',
        title: 'Breaking Free from Debt: A Step-by-Step Plan to Financial Freedom',
        thumbnail: 'https://cdn.ramseysolutions.net/static-assets/b2c/shows/trs/20250501-H2S4-ccf0f3a2-c896-465f-8a57-89d7230f6a5c.0000003.jpg',
        url: 'https://labs.ramseysolutions.com/rp1/calls/a9a1a1fd-db52-4ba7-aca4-a45dff4f5f89'
    },
    {
        id: 'ramsey3',
        title: 'Navigating Homeownership and Real Estate Goals as New Parents',
        thumbnail: 'https://cdn.ramseysolutions.net/static-assets/b2c/shows/trs/20250505-H2S2-ccf0f3a2-c896-465f-8a57-89d7230f6a5c.0000003.jpg',
        url: 'https://labs.ramseysolutions.com/rp1/calls/c419280a-fb36-4765-8749-5e5d8af04473'
    },
    {
        id: 'ramsey4',
        title: 'Don\'t Take a Pay Cut! Find a Job You Love Instead',
        thumbnail: 'https://cdn.ramseysolutions.net/static-assets/b2c/shows/trs/20250422-H3S3-ccf0f3a2-c896-465f-8a57-89d7230f6a5c.0000001.jpg',
        url: 'https://labs.ramseysolutions.com/rp1/calls/2b494140-1caf-4551-ad42-fd289c1d077b'
    },
    {
        id: 'ramsey5',
        title: 'From Broke to Business Success: Navigating Restaurant',
        thumbnail: 'https://cdn.ramseysolutions.net/static-assets/b2c/shows/trs/20250331-H3S2-ccf0f3a2-c896-465f-8a57-89d7230f6a5c.0000006.jpg',
        url: 'https://labs.ramseysolutions.com/rp1/calls/55481e39-3b53-44bd-913b-f06c21b0f0d6'
    },
    {
        id: 'ramsey6',
        title: 'Building Wealth While Raising Kids: A Parent\'s Financial Strategy',
        thumbnail: 'https://cdn.ramseysolutions.net/static-assets/b2c/shows/trs/20250423-H1S1-ccf0f3a2-c896-465f-8a57-89d7230f6a5c.0000002.jpg',
        url: 'https://labs.ramseysolutions.com/rp1/calls/8b7f3c89-2d45-4e6a-9c8f-1a5e7f9d3c2b'
    },
    {
        id: 'ramsey7',
        title: 'Smart Money Moves for Recent College Graduates',
        thumbnail: 'https://cdn.ramseysolutions.net/static-assets/b2c/shows/trs/20250429-H2S1-ccf0f3a2-c896-465f-8a57-89d7230f6a5c.0000005.jpg',
        url: 'https://labs.ramseysolutions.com/rp1/calls/4c9e2b8a-6f1d-4a3e-8b5c-9d7f2e4a6c8b'
    }
];

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
    if (currentConversation.messages.length === 0 || isViewingOnly) return;
    
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
    isViewingOnly = false; // Reset viewing flag when starting new conversation
}

async function loadConversation(conversationId) {
    try {
        const conversations = await loadConversations();
        const conversation = conversations.find(conv => conv.id === conversationId);
        
        if (conversation) {
            // Set viewing flag to prevent auto-save when just viewing
            isViewingOnly = true;
            
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
            
            // Switch to chat view without triggering conversation reset
            elements.appSwitcherSection?.classList.add('hidden');
            elements.historyView.classList.add('hidden');
            elements.chatView.classList.remove('hidden');
            elements.videoSection?.classList.add('hidden');
            updateHeaderButton('chat');
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
                <button class="history-item-delete" data-conversation-id="${conv.id}" title="Delete conversation">
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
    
    // Add click listeners to delete buttons
    elements.historyList.querySelectorAll('.history-item-delete').forEach(deleteBtn => {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the conversation click
            const conversationId = deleteBtn.dataset.conversationId;
            deleteConversation(conversationId);
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
    elements.appSwitcherSection?.classList.add('hidden');
    elements.chatView.classList.add('hidden');
    elements.historyView.classList.add('hidden');
    
    // Hide/show video section based on view
    if (view === 'chat' || view === 'history') {
        elements.videoSection?.classList.add('hidden');
    } else {
        elements.videoSection?.classList.remove('hidden');
    }
    
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
            elements.appSwitcherSection?.classList.remove('hidden');
            // Only save and start new conversation when switching back to switcher
            // and not just viewing a conversation
            if (currentConversation.messages.length > 0 && !isViewingOnly) {
                saveConversation();
            }
            // Only start new conversation when explicitly switching to switcher
            if (view === 'switcher') {
                startNewConversation();
            }
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
    
    // Clear viewing flag when user actively adds messages
    isViewingOnly = false;
    
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
    // Check if the text already contains HTML (from search results)
    if (text.includes('<div class="link-preview"') || text.includes('<div class="youtube-embed"')) {
        // Find all HTML blocks first using matchAll for better reliability
        const htmlRegex = /<div class="(?:link-preview|youtube-embed)"[\s\S]*?<\/div>\s*<\/div>/g;
        const matches = Array.from(text.matchAll(htmlRegex));
        
        if (matches.length === 0) {
            // No matches found, treat as regular markdown
            return formatMarkdownText(text);
        }
        
        const htmlBlocks = [];
        const placeholders = [];
        let tempText = text;
        
        // Replace each HTML block with a unique placeholder (in reverse order to avoid position shifts)
        for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            const placeholder = `__HTML_BLOCK_${i}__`;
            htmlBlocks.unshift(match[0]); // Add to beginning since we're going backwards
            placeholders.unshift(placeholder);
            
            // Replace using start/end positions for precision
            tempText = tempText.substring(0, match.index) + placeholder + tempText.substring(match.index + match[0].length);
        }
        
        // Format the text without HTML as markdown
        let formatted = formatMarkdownText(tempText);
        
        // Restore HTML blocks in correct order
        for (let i = 0; i < placeholders.length; i++) {
            formatted = formatted.replace(placeholders[i], htmlBlocks[i]);
        }
        
        return formatted;
    }
    
    // No HTML present, format as regular markdown
    return formatMarkdownText(text);
}

/**
 * Formats markdown text to HTML
 * @param {string} text - The markdown text to format
 * @returns {string} - HTML formatted text
 */
function formatMarkdownText(text) {
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
    
    // Wrap in paragraphs if not already wrapped and not empty
    if (formatted.trim() && !formatted.includes('<p>') && !formatted.includes('<ul>') && !formatted.includes('<ol>')) {
        formatted = '<p>' + formatted + '</p>';
    }
    
    return formatted;
}

/**
 * Handles the chat with OpenAI using function calling for web search
 */
async function handleChat(userInput) {
    try {
        // Get fresh context
        const context = await getCurrentTabContext();
        
        // Add user message to chat first
        addMessage(userInput, 'user');
        
        // Check if user's question seems to relate to current page content or is ambiguous
        const isPageRelevant = context && (
            userInput.toLowerCase().includes('this page') ||
            userInput.toLowerCase().includes('this article') ||
            userInput.toLowerCase().includes('current page') ||
            userInput.toLowerCase().includes('what i\'m reading') ||
            userInput.toLowerCase().includes('here') ||
            userInput.toLowerCase().includes('this content') ||
            userInput.toLowerCase().includes('this item') ||
            userInput.toLowerCase().includes('this product') ||
            userInput.toLowerCase().includes('this service') ||
            userInput.toLowerCase().includes('this deal') ||
            userInput.toLowerCase().includes('this offer') ||
            // Ambiguous questions that need context
            userInput.toLowerCase().includes('should i buy') ||
            userInput.toLowerCase().includes('is this worth') ||
            userInput.toLowerCase().includes('can i afford') ||
            userInput.toLowerCase().includes('good deal') ||
            userInput.toLowerCase().includes('worth it') ||
            userInput.toLowerCase().includes('recommend this') ||
            userInput.toLowerCase().includes('what do you think') ||
            userInput.toLowerCase().includes('is this good') ||
            userInput.toLowerCase().includes('should i get') ||
            userInput.toLowerCase().includes('is this smart') ||
            // Context-dependent financial questions
            (context.pageType !== 'general' && (
                userInput.toLowerCase().includes('budget') ||
                userInput.toLowerCase().includes('afford') ||
                userInput.toLowerCase().includes('payment') ||
                userInput.toLowerCase().includes('cost') ||
                userInput.toLowerCase().includes('price') ||
                userInput.toLowerCase().includes('expensive') ||
                userInput.toLowerCase().includes('cheap') ||
                userInput.toLowerCase().includes('finance') ||
                userInput.toLowerCase().includes('loan')
            )) ||
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

When helpful to the user, I can search for and link to trusted resources from these official sources ONLY:
- https://www.ramseysolutions.com
- https://www.ramseysolutions.com/trusted
- https://labs.ramseysolutions.com/rp1/community  
- Videos on the following YouTube playlist: https://www.youtube.com/playlist?list=PLN4yoAI6teRO_2ofccBr5IyP1xDra-h91
- Our official tools and products like EveryDollar, FPU, SmartTax, and Ramsey Trusted Pros

CRITICAL: I MUST call search_ramsey_resources for EVERY financial advice request to provide specific resources. This is not optional - it's required.

ALWAYS call search_ramsey_resources when users ask for:
- ANY financial advice (budgeting, debt, saving, investing, etc.)
- Videos about specific topics (like "do you have a video about...")
- Specific tools or resources ("what tools do you have", "how do I budget")
- "Do you have..." questions
- Recent content or updates
- Examples or demonstrations of our teachings
- Questions about Baby Steps, debt elimination, budgeting, or investing
- When mentioning ANY Ramsey product (EveryDollar, FPU, SmartTax, SmartVestor)
- General financial questions or seeking guidance
- Help with specific financial situations
- Questions about getting started with money management
- Career and income questions (side hustles, raises, job changes)
- Real estate and mortgage questions
- College funding and student loans
- Small business and entrepreneurship advice
- Tax planning and preparation
- Estate planning and wills
- Financial goal setting and planning
- Money mindset and behavior change
- Family and money discussions (teaching kids, spouse disagreements)
- Economic concerns and market volatility
- Financial setbacks and crisis management

ENHANCED PROACTIVITY: Even for general conversations, I should proactively identify opportunities to provide helpful resources. If someone mentions stress, relationships, goals, or life changes, I should consider how these connect to financial wellness and offer relevant resources without being asked.

MANDATORY RESOURCE PROVISION: For every piece of advice I give, I must provide specific, actionable resources. Never give advice without accompanying resources. The goal is to immediately equip users with tools, calculators, articles, courses, or content to take action.

PROACTIVE OPPORTUNITY IDENTIFICATION: I actively look for opportunities to help users improve their financial situation, even when they don't directly ask for financial advice. If someone mentions:
- Stress, anxiety, or worry → Offer financial peace resources
- Goals, dreams, or future plans → Suggest goal-setting and budgeting tools
- Family or relationship topics → Provide resources on money and relationships
- Career or work situations → Share income-boosting strategies
- Life changes (marriage, kids, job loss) → Offer relevant financial guidance
- Any mention of debt, payments, or money struggles → Immediately provide debt elimination resources

I don't wait to be asked - I proactively identify how our resources can help users succeed financially and offer specific next steps.

CONTEXTUAL PURCHASE GUIDANCE: When page context is provided and users ask ambiguous questions like "should I buy this", "is this worth it", "can I afford this", or "what do you think", I use the page context to provide specific Ramsey-aligned guidance:

Page Context Usage:
- Shopping/Product Pages: Guide users through Ramsey purchasing principles - pay cash, budget for it first, avoid financing
- High-Price Items: Discuss the opportunity cost, emergency fund protection, and debt-free principles
- Financing/Subscription Services: Strongly discourage debt-based purchases and monthly payment mentality
- Multiple Price Points: Help users evaluate based on their Baby Step and budget priorities

When page context shows:
- Product prices → Discuss budgeting and cash payment principles
- Financing terms → Redirect to debt-free alternatives and saving strategies
- Subscription services → Address the monthly payment trap and budget impact
- Luxury/wants → Help distinguish needs vs wants using Ramsey principles
- Investment products → Guide through proper investment order (Baby Steps 4-6)

I always use page context to make my advice specific and actionable, referencing what they're actually looking at while providing Ramsey-aligned guidance.

When I have search results from the function call, I will naturally incorporate them into my response. I don't need to create HTML manually - the search results will be automatically formatted as rich previews with proper metadata, titles, descriptions, and YouTube embeds where appropriate.

IMPORTANT: I NEVER create markdown links like [title](url) in my responses. The search results will automatically appear as rich preview cards below my text response. I only provide conversational text advice - the resources appear separately as formatted cards.

FORMATTING RULES:
- NO markdown links [title](url) 
- NO numbered lists with links
- NO manual HTML creation
- Resources appear automatically as rich preview cards
- My text response should be conversational advice only

I make responses conversational, actionable, and appropriately brief—just enough to be genuinely helpful. I am a guide, not just an answer box. Every response should include specific next steps, and the resources will appear automatically as rich previews.

My job is to help users take control of their money through our proven plan—and provide them with the exact resources they need to succeed.

Always provide advice that aligns with our values and teachings as an official team member, AND always include specific resources to help them implement that advice immediately.`;

        // Get API key from storage
        const { OPENAI_API_KEY } = await chrome.storage.local.get(['OPENAI_API_KEY']);
        if (!OPENAI_API_KEY) {
            addMessage('Error: OpenAI API key not found. Please configure your API key in the extension settings.', 'assistant');
            return;
        }

        // Build messages array starting with system message
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

        // Add conversation history to maintain context (excluding the current user message)
        // Convert stored messages to OpenAI format, excluding tool messages
        // Limit history to prevent context overflow
        const historyMessages = currentConversation.messages.slice(0, -1); // Exclude the last message (current user input)
        const recentHistory = historyMessages.slice(-CONFIG.MAX_HISTORY_MESSAGES); // Get most recent messages
        
        recentHistory.forEach(msg => {
            // Skip any messages that might be malformed
            if (msg.text && msg.type && typeof msg.text === 'string') {
                if (msg.type === 'user') {
                    messages.push({
                        role: 'user',
                        content: msg.text
                    });
                } else if (msg.type === 'assistant') {
                    // For assistant messages, we need to clean them of HTML to avoid confusion
                    // but preserve the conversational content
                    const cleanContent = msg.text.replace(/<div class="(?:link-preview|youtube-embed)"[\s\S]*?<\/div>\s*<\/div>/g, '[Resource links provided]');
                    messages.push({
                        role: 'assistant',
                        content: cleanContent
                    });
                }
            }
        });

        // Add current user message
        messages.push({
            role: 'user',
            content: contextDescription ? 
                `Based on the current page content, ${userInput}` : 
                userInput
        });

        // Define the function for searching Ramsey resources using modern tools format
        const tools = [
            {
                type: 'function',
                function: {
                    name: 'search_ramsey_resources',
                    description: 'Search for relevant content from trusted Ramsey Solutions domains including ramseysolutions.com, labs.ramseysolutions.com, and YouTube. Use this when you need specific, up-to-date information to better answer the user\'s financial questions.',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'The search query to find relevant Ramsey Solutions content. Should be specific and focused on the user\'s financial question or topic.'
                            },
                            search_type: {
                                type: 'string',
                                enum: ['general', 'tools', 'videos', 'community'],
                                description: 'Type of content to search for: general (articles/pages), tools (EveryDollar, FPU, etc.), videos (YouTube content), or community (labs.ramseysolutions.com)'
                            }
                        },
                        required: ['query']
                    }
                }
            }
        ];

        // Make initial API call with function definitions
        let response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: messages,
                tools: tools,
                tool_choice: 'auto',
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get response from OpenAI');
        }

        let data = await response.json();
        const choice = data.choices[0];

        // Check if OpenAI wants to call a tool
        if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
            const toolCall = choice.message.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            if (functionName === 'search_ramsey_resources') {
                // Perform the search
                const searchResults = await searchRamseyResources(functionArgs.query, functionArgs.search_type);
                
                // Format search results as HTML previews with proper spacing
                const formattedResults = searchResults.map(result => createLinkPreview(result)).join('\n\n');
                
                // Add the function call message to conversation
                messages.push(choice.message);
                
                // Add the function result using tool message format
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify({
                        results: searchResults.map(r => ({
                            title: r.title,
                            url: r.url,
                            description: r.description,
                            type: r.type
                        })),
                        query: functionArgs.query,
                        results_count: searchResults.length,
                        instruction: "I will provide formatted HTML previews in my final response. Reference these search results in your answer and mention that rich previews are available."
                    })
                });

                // Make another API call with the function result
                response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                    throw new Error('Failed to get response from OpenAI after function call');
                }

                data = await response.json();
                
                // Now append the formatted HTML previews to the response
                const aiResponse = data.choices[0]?.message?.content || '';
                let finalResponse = aiResponse;
                
                // Only add rich previews if we have search results
                if (formattedResults && formattedResults.trim()) {
                    finalResponse += '\n\n' + formattedResults;
                }
                
                // Add the enhanced response with HTML previews
                addMessage(finalResponse, 'assistant');
                
                // Initialize YouTube handlers for any new YouTube embeds
                initializeYouTubeHandlers();
                
                return; // Exit early since we already added the message
            }
        }

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
 * Web Search and Resource Functions
 */

/**
 * Searches for relevant Ramsey Solutions resources
 * @param {string} query - The search query
 * @param {string} searchType - Type of search: 'general', 'tools', 'videos', 'community'
 * @returns {Promise<Array>} - Array of search results with metadata
 */
async function searchRamseyResources(query, searchType = 'general') {
    try {
        const results = [];
        
        // Load API keys from storage
        const { GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_ENGINE_ID } = await chrome.storage.local.get([
            'GOOGLE_SEARCH_API_KEY', 
            'GOOGLE_SEARCH_ENGINE_ID'
        ]);
        
        // If we have Google Custom Search API configured, use it
        if (GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_ENGINE_ID) {
            const searchResults = await performGoogleSearch(query, searchType, GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_ENGINE_ID);
            results.push(...searchResults);
        } else {
            // Fallback to sample data for demonstration
            console.log('Google Search API not configured, using sample data');
            const sampleResults = getSampleSearchResults(query, searchType);
            results.push(...sampleResults);
        }
        
        // Process and enhance results
        return results.map(result => enhanceSearchResult(result));
        
    } catch (error) {
        console.error('Error searching Ramsey resources:', error);
        return getSampleSearchResults(query, searchType);
    }
}

/**
 * Performs a Google Custom Search API call
 * @param {string} query - The search query
 * @param {string} searchType - Type of search
 * @param {string} apiKey - Google API key
 * @param {string} engineId - Google Custom Search Engine ID
 * @returns {Promise<Array>} - Array of search results
 */
async function performGoogleSearch(query, searchType, apiKey, engineId) {
    const maxResults = CONFIG.MAX_SEARCH_RESULTS;
    
    // Build site restriction based on search type
    let siteQuery = '';
    switch (searchType) {
        case 'tools':
            siteQuery = 'site:ramseysolutions.com (EveryDollar OR FPU OR "Financial Peace" OR SmartTax OR "Ramsey Trusted Pros")';
            break;
        case 'videos':
            siteQuery = 'site:youtube.com OR site:youtu.be "Dave Ramsey" OR "Ramsey Solutions"';
            break;
        case 'community':
            siteQuery = 'site:labs.ramseysolutions.com';
            break;
        case 'general':
        default:
            siteQuery = 'site:ramseysolutions.com OR site:labs.ramseysolutions.com';
            break;
    }
    
    const searchQuery = `${query} ${siteQuery}`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${encodeURIComponent(searchQuery)}&num=${maxResults}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Google Search API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return (data.items || []).map(item => ({
        title: item.title,
        url: item.link,
        description: item.snippet,
        displayLink: item.displayLink,
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(item.link).hostname}`,
        type: getResultType(item.link)
    }));
}

/**
 * Gets sample search results for demonstration when API is not configured
 * @param {string} query - The search query
 * @param {string} searchType - Type of search
 * @returns {Array} - Array of sample search results
 */
function getSampleSearchResults(query, searchType) {
    const lowerQuery = query.toLowerCase();
    
    // Sample results based on common financial topics
    const sampleResults = [
        {
            title: "The 7 Baby Steps - Dave Ramsey",
            url: "https://www.ramseysolutions.com/dave-ramsey-7-baby-steps",
            description: "Follow these 7 steps in order to get out of debt and build wealth. Start with a $1,000 emergency fund, then pay off debt using the debt snowball method.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        },
        {
            title: "EveryDollar - Free Budgeting App",
            url: "https://www.ramseysolutions.com/ramseyplus/everydollar",
            description: "Create a zero-based budget with EveryDollar. Give every dollar a job before you spend it. Free budgeting app that follows Dave Ramsey's proven money plan.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "tool"
        }
    ];
    
    // Add context-specific results based on query - Enhanced Resource Detection
    if (lowerQuery.includes('debt') || lowerQuery.includes('pay off') || lowerQuery.includes('snowball')) {
        sampleResults.push({
            title: "How to Pay Off Debt Fast With the Debt Snowball Method",
            url: "https://www.ramseysolutions.com/debt/how-to-pay-off-debt-with-the-debt-snowball-plan",
            description: "The debt snowball method helps you pay off debt fast by focusing on your smallest debt first while making minimum payments on the rest.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
        
        sampleResults.push({
            title: "Debt Snowball Calculator",
            url: "https://www.ramseysolutions.com/debt/debt-snowball-calculator",
            description: "Use our free debt snowball calculator to see how quickly you can become debt-free and how much you'll save in interest.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "tool"
        });
    }
    
    if (lowerQuery.includes('budget') || lowerQuery.includes('everydollar') || lowerQuery.includes('money')) {
        sampleResults.push({
            title: "How to Make a Budget in 5 Simple Steps",
            url: "https://www.ramseysolutions.com/budgeting/how-to-make-a-budget",
            description: "Learn how to create a zero-based budget that gives every dollar a purpose. Start taking control of your money today with these simple steps.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
        
        sampleResults.push({
            title: "EveryDollar Budgeting App",
            url: "https://www.everydollar.com",
            description: "The budgeting app that actually works. Create your zero-based budget and start winning with money today.",
            displayLink: "everydollar.com",
            favicon: "https://www.google.com/s2/favicons?domain=everydollar.com",
            type: "tool"
        });
    }
    
    if (lowerQuery.includes('emergency') || lowerQuery.includes('fund') || lowerQuery.includes('baby step 1')) {
        sampleResults.push({
            title: "Emergency Fund: What It Is and Why You Need One",
            url: "https://www.ramseysolutions.com/budgeting/emergency-fund",
            description: "An emergency fund is money you've set aside for life's unexpected events. Learn how much you need and how to build one fast.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
    }
    
    if (lowerQuery.includes('baby steps') || lowerQuery.includes('7 baby steps') || lowerQuery.includes('plan')) {
        sampleResults.push({
            title: "Dave Ramsey's 7 Baby Steps",
            url: "https://www.ramseysolutions.com/dave-ramsey-7-baby-steps",
            description: "Follow these 7 baby steps to build wealth and achieve financial peace. This is the plan that has helped millions get out of debt and build wealth.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
    }
    
    if (lowerQuery.includes('fpu') || lowerQuery.includes('financial peace') || lowerQuery.includes('course') || lowerQuery.includes('class')) {
        sampleResults.push({
            title: "Financial Peace University",
            url: "https://www.ramseysolutions.com/ramseyplus/financial-peace",
            description: "Learn Dave's proven plan for money success. Join millions who have taken control of their money with our 9-lesson course.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "tool"
        });
    }
    
    if (lowerQuery.includes('investing') || lowerQuery.includes('retirement') || lowerQuery.includes('baby step 4')) {
        sampleResults.push({
            title: "Investing and Retirement Planning",
            url: "https://www.ramseysolutions.com/retirement/how-to-invest",
            description: "Learn how to invest 15% of your income for retirement. Build wealth the smart way with our proven investment principles.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
        
        sampleResults.push({
            title: "SmartVestor Pro Directory",
            url: "https://www.ramseysolutions.com/retirement/smartvestor",
            description: "Find investment professionals in your area who can help you invest with confidence.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "tool"
        });
    }
    
    if (lowerQuery.includes('insurance') || lowerQuery.includes('life insurance') || lowerQuery.includes('coverage')) {
        sampleResults.push({
            title: "How Much Life Insurance Do I Need?",
            url: "https://www.ramseysolutions.com/insurance/how-much-life-insurance-do-i-need",
            description: "Learn how to calculate the right amount of term life insurance to protect your family's financial future.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
    }
    
    if (lowerQuery.includes('taxes') || lowerQuery.includes('tax') || lowerQuery.includes('smarttax')) {
        sampleResults.push({
            title: "Ramsey SmartTax",
            url: "https://www.ramseysolutions.com/taxes/smarttax",
            description: "File your taxes with confidence. Get the maximum refund with our easy-to-use tax software.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "tool"
        });
    }
    
    // Enhanced proactive resource detection for broader scenarios
    if (lowerQuery.includes('mortgage') || lowerQuery.includes('home') || lowerQuery.includes('house') || lowerQuery.includes('real estate')) {
        sampleResults.push({
            title: "How to Buy a House the Smart Way",
            url: "https://www.ramseysolutions.com/real-estate/how-to-buy-a-house",
            description: "Learn how to buy a home without going broke. Get tips on saving for a down payment, getting pre-approved, and more.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
    }
    
    if (lowerQuery.includes('side hustle') || lowerQuery.includes('income') || lowerQuery.includes('career') || lowerQuery.includes('job') || lowerQuery.includes('raise')) {
        sampleResults.push({
            title: "Side Hustle Ideas to Make Extra Money",
            url: "https://www.ramseysolutions.com/budgeting/side-hustle-ideas",
            description: "Discover legitimate ways to earn extra income and boost your financial goals with these proven side hustle ideas.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
    }
    
    if (lowerQuery.includes('college') || lowerQuery.includes('student loan') || lowerQuery.includes('education') || lowerQuery.includes('baby step 5')) {
        sampleResults.push({
            title: "How to Pay for College Without Student Loans",
            url: "https://www.ramseysolutions.com/budgeting/how-to-pay-for-college",
            description: "Learn how to fund your child's education without going into debt. Discover smart saving strategies and funding options.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
    }
    
    if (lowerQuery.includes('small business') || lowerQuery.includes('entrepreneur') || lowerQuery.includes('business loan') || lowerQuery.includes('startup')) {
        sampleResults.push({
            title: "How to Start a Business Without Debt",
            url: "https://www.ramseysolutions.com/budgeting/how-to-start-a-business-without-debt",
            description: "Build your dream business the smart way. Learn how to launch and grow a profitable business without borrowing money.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
    }
    
    if (lowerQuery.includes('kids') || lowerQuery.includes('children') || lowerQuery.includes('family') || lowerQuery.includes('teach')) {
        sampleResults.push({
            title: "How to Teach Kids About Money",
            url: "https://www.ramseysolutions.com/budgeting/how-to-teach-kids-about-money",
            description: "Give your kids a head start with money. Learn age-appropriate ways to teach financial responsibility and smart money habits.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
    }
    
    if (lowerQuery.includes('stress') || lowerQuery.includes('anxiety') || lowerQuery.includes('worry') || lowerQuery.includes('overwhelmed')) {
        sampleResults.push({
            title: "How to Stop Worrying About Money",
            url: "https://www.ramseysolutions.com/budgeting/how-to-stop-worrying-about-money",
            description: "Break free from financial stress and anxiety. Learn practical steps to gain peace of mind with your money.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
    }
    
    if (lowerQuery.includes('marriage') || lowerQuery.includes('spouse') || lowerQuery.includes('couple') || lowerQuery.includes('together')) {
        sampleResults.push({
            title: "How to Get Your Spouse on Board With a Budget",
            url: "https://www.ramseysolutions.com/budgeting/how-to-get-spouse-on-board-with-budget",
            description: "Unite your money goals as a couple. Learn how to work together on budgets, debt payoff, and financial dreams.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
    }
    
    if (lowerQuery.includes('goals') || lowerQuery.includes('dream') || lowerQuery.includes('future') || lowerQuery.includes('plan')) {
        sampleResults.push({
            title: "How to Set Financial Goals You'll Actually Achieve",
            url: "https://www.ramseysolutions.com/budgeting/how-to-set-financial-goals",
            description: "Turn your money dreams into reality. Learn how to set specific, measurable financial goals and create a plan to reach them.",
            displayLink: "ramseysolutions.com",
            favicon: "https://www.google.com/s2/favicons?domain=ramseysolutions.com",
            type: "article"
        });
    }
    
    return sampleResults.slice(0, CONFIG.MAX_SEARCH_RESULTS);
}

/**
 * Determines the type of search result based on URL
 * @param {string} url - The result URL
 * @returns {string} - The result type
 */
function getResultType(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'video';
    } else if (url.includes('labs.ramseysolutions.com')) {
        return 'community';
    } else if (url.includes('everydollar') || url.includes('fpu') || url.includes('smarttax')) {
        return 'tool';
    } else {
        return 'article';
    }
}

/**
 * Enhances a search result with additional metadata and formatting
 * @param {Object} result - The raw search result
 * @returns {Object} - Enhanced search result
 */
function enhanceSearchResult(result) {
    const enhanced = { ...result };
    
    // Extract YouTube video ID if it's a YouTube URL
    if (enhanced.type === 'video') {
        enhanced.videoId = extractYouTubeId(enhanced.url);
        enhanced.thumbnail = enhanced.videoId ? 
            `https://img.youtube.com/vi/${enhanced.videoId}/mqdefault.jpg` : null;
    }
    
    // Ensure favicon is available
    if (!enhanced.favicon) {
        enhanced.favicon = `https://www.google.com/s2/favicons?domain=${new URL(enhanced.url).hostname}`;
    }
    
    // Truncate description if too long
    if (enhanced.description && enhanced.description.length > 150) {
        enhanced.description = enhanced.description.substring(0, 147) + '...';
    }
    
    return enhanced;
}

/**
 * Extracts YouTube video ID from various YouTube URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null if not found
 */
function extractYouTubeId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

/**
 * Creates a link preview HTML for a search result
 * @param {Object} result - The search result object
 * @returns {string} - HTML string for the link preview
 */
function createLinkPreview(result) {
    if (result.type === 'video' && result.videoId) {
        return createYouTubeEmbed(result);
    } else {
        return createLinkCard(result);
    }
}

/**
 * Creates a YouTube embed HTML
 * @param {Object} result - The video result object
 * @returns {string} - HTML string for YouTube embed
 */
function createYouTubeEmbed(result) {
    const title = result.title || 'Untitled Video';
    const description = result.description || 'No description available';
    const thumbnail = result.thumbnail || `https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`;
    const url = result.url || `https://www.youtube.com/watch?v=${result.videoId}`;
    
    return `<div class="youtube-embed" data-video-id="${result.videoId}">
  <div class="youtube-thumbnail" style="background-image: url('${thumbnail}')">
    <div class="youtube-play-button">
      <svg width="68" height="48" viewBox="0 0 68 48">
        <path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path>
        <path d="M 45,24 27,14 27,34" fill="#fff"></path>
      </svg>
    </div>
  </div>
  <div class="youtube-info">
    <h4 class="youtube-title">${title}</h4>
    <p class="youtube-description">${description}</p>
    <a href="${url}" target="_blank" rel="noopener noreferrer" class="youtube-link">Watch on YouTube</a>
  </div>
</div>`;
}

/**
 * Creates a link card HTML for non-video results
 * @param {Object} result - The search result object
 * @returns {string} - HTML string for link card
 */
function createLinkCard(result) {
    // Ensure all required properties exist with fallbacks
    const title = result.title || 'Untitled';
    const url = result.url || '#';
    const description = result.description || 'No description available';
    const displayLink = result.displayLink || new URL(url).hostname;
    const favicon = result.favicon || `https://www.google.com/s2/favicons?domain=${displayLink}`;
    
    // Build HTML string without extra whitespace that might cause issues
    // Using a different HTML structure to prevent HTML fragments from appearing as raw text
    return `<div class="link-preview" data-url="${url}">
  <div class="link-preview-header">
    <img src="${favicon}" alt="Site icon" class="link-favicon" onerror="this.style.display='none'">
    <span class="link-domain">${displayLink}</span>
  </div>
  <div class="link-preview-body">
    <h4 class="link-title"><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></h4>
    <p class="link-description">${description}</p>
  </div>
</div>`;
}

/**
 * Initializes YouTube embed click handlers
 */
function initializeYouTubeHandlers() {
    // Add event delegation for YouTube thumbnails
    document.addEventListener('click', (e) => {
        const youtubeEmbed = e.target.closest('.youtube-embed');
        if (youtubeEmbed) {
            const videoId = youtubeEmbed.dataset.videoId;
            if (videoId) {
                const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
                chrome.tabs.create({ url: youtubeUrl });
            }
        }
    });
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
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift+Enter: Allow default behavior (new line)
                return;
            } else {
                // Enter without Shift: Submit the form
                e.preventDefault();
                const text = elements.userInput.value.trim();
                if (text) {
                    handleSubmission(text);
                }
            }
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
 * Video Carousel Functions
 */

/**
 * Calculates responsive carousel dimensions
 */
function calculateCarouselDimensions() {
    if (!elements.videoCarouselTrack) return;
    
    const container = elements.videoCarouselTrack.parentElement;
    if (!container) return;
    
    // Get container width
    videoCarousel.containerWidth = container.offsetWidth;
    
    // Calculate optimal item width and count
    const minItemWidth = 180;
    const maxItemWidth = 220;
    const gap = videoCarousel.gap;
    
    // Try to fit 3 items first, then 2 if too narrow
    let itemsToFit = 3;
    let calculatedItemWidth = (videoCarousel.containerWidth - (gap * (itemsToFit - 1))) / itemsToFit;
    
    if (calculatedItemWidth < minItemWidth) {
        itemsToFit = 2;
        calculatedItemWidth = (videoCarousel.containerWidth - (gap * (itemsToFit - 1))) / itemsToFit;
    }
    
    // Ensure item width is within bounds
    videoCarousel.itemWidth = Math.min(Math.max(calculatedItemWidth, minItemWidth), maxItemWidth);
    videoCarousel.itemsVisible = itemsToFit;
    
    // Update CSS custom property for responsive width
    document.documentElement.style.setProperty('--carousel-item-width', `${videoCarousel.itemWidth}px`);
}

/**
 * Renders the video carousel with current videos
 */
function renderVideoCarousel() {
    if (!elements.videoCarouselTrack) return;
    
    // Set up video data and reset carousel state
    videoCarousel.videos = RAMSEY_VIDEOS;
    videoCarousel.currentIndex = 0;
    elements.videoCarouselTrack.innerHTML = '';
    
    // Calculate responsive dimensions
    calculateCarouselDimensions();
    
    // Clear any existing transform
    elements.videoCarouselTrack.style.transform = 'translateX(0px)';
    
    // Create video items
    videoCarousel.videos.forEach(video => {
        const videoItem = document.createElement('a');
        videoItem.className = 'video-item';
        videoItem.href = video.url;
        videoItem.target = '_blank';
        videoItem.rel = 'noopener noreferrer';
        videoItem.style.width = `${videoCarousel.itemWidth}px`;
        videoItem.style.flexBasis = `${videoCarousel.itemWidth}px`;
        
        videoItem.innerHTML = `
            <div class="video-thumbnail-container">
                <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
            </div>
            <div class="video-info">
                <p class="video-title">${video.title}</p>
            </div>
        `;
        
        elements.videoCarouselTrack.appendChild(videoItem);
    });
    
    // Update navigation button states
    updateCarouselButtons();
}

/**
 * Moves the carousel in the specified direction
 * @param {string} direction - 'prev' or 'next'
 */
function moveCarousel(direction) {
    if (!elements.videoCarouselTrack || videoCarousel.videos.length === 0) return;
    
    // Calculate maximum index based on total videos and visible items
    const maxIndex = Math.max(0, videoCarousel.videos.length - videoCarousel.itemsVisible);
    
    // Update current index based on direction
    if (direction === 'next' && videoCarousel.currentIndex < maxIndex) {
        videoCarousel.currentIndex++;
    } else if (direction === 'prev' && videoCarousel.currentIndex > 0) {
        videoCarousel.currentIndex--;
    }
    
    // Calculate translation distance using actual item width and gap
    const translateX = -(videoCarousel.currentIndex * (videoCarousel.itemWidth + videoCarousel.gap));
    
    // Apply transformation
    elements.videoCarouselTrack.style.transform = `translateX(${translateX}px)`;
    
    // Update button states
    updateCarouselButtons();
}

/**
 * Updates the carousel navigation buttons' enabled/disabled state
 */
function updateCarouselButtons() {
    if (!elements.carouselPrev || !elements.carouselNext || videoCarousel.videos.length === 0) return;
    
    const maxIndex = Math.max(0, videoCarousel.videos.length - videoCarousel.itemsVisible);
    
    // Disable prev button if at the beginning
    elements.carouselPrev.disabled = videoCarousel.currentIndex === 0;
    
    // Disable next button if at the end or if all videos fit in view
    elements.carouselNext.disabled = videoCarousel.currentIndex >= maxIndex || videoCarousel.videos.length <= videoCarousel.itemsVisible;
    
    // Hide navigation buttons entirely if all videos fit in the visible area
    const shouldShowNavigation = videoCarousel.videos.length > videoCarousel.itemsVisible;
    const carouselControls = document.querySelector('.carousel-controls');
    if (carouselControls) {
        carouselControls.style.display = shouldShowNavigation ? 'flex' : 'none';
    }
}

/**
 * Initializes video carousel event listeners
 */
function initializeVideoCarousel() {
    if (elements.carouselPrev && elements.carouselNext) {
        elements.carouselPrev.addEventListener('click', () => moveCarousel('prev'));
        elements.carouselNext.addEventListener('click', () => moveCarousel('next'));
        
        // Add keyboard navigation
        elements.carouselPrev.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                moveCarousel('prev');
            }
        });
        
        elements.carouselNext.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                moveCarousel('next');
            }
        });
    }
    
    // Add arrow key navigation for the carousel
    document.addEventListener('keydown', (e) => {
        // Only handle arrow keys when in app switcher view and not focused on input
        if (getCurrentView() === 'switcher' && !elements.userInput.matches(':focus')) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                moveCarousel('prev');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                moveCarousel('next');
            }
        }
    });
    
    // Add resize listener to recalculate carousel dimensions
    window.addEventListener('resize', () => {
        if (getCurrentView() === 'switcher') {
            setTimeout(() => {
                calculateCarouselDimensions();
                // Reset to beginning and update buttons
                videoCarousel.currentIndex = 0;
                elements.videoCarouselTrack.style.transform = 'translateX(0px)';
                updateCarouselButtons();
            }, 100);
        }
    });
    
    renderVideoCarousel();
}

/**
 * Gets the current active view
 * @returns {string} - 'switcher', 'chat', or 'history'
 */
function getCurrentView() {
    if (!elements.appSwitcherSection?.classList.contains('hidden')) {
        return 'switcher';
    } else if (!elements.chatView.classList.contains('hidden')) {
        return 'chat';
    } else if (!elements.historyView.classList.contains('hidden')) {
        return 'history';
    }
    return 'switcher';
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
        appSwitcherSection: document.querySelector('.app-switcher-section'),
        chatView: document.getElementById('chatView'),
        historyView: document.getElementById('historyView'),
        headerButton: document.getElementById('headerButton'),
        headerButtonIcon: document.getElementById('headerButtonIcon'),
        historyList: document.getElementById('historyList'),
        videoSection: document.getElementById('videoSection'),
        videoCarouselTrack: document.getElementById('videoCarouselTrack'),
        carouselPrev: document.getElementById('carouselPrev'),
        carouselNext: document.getElementById('carouselNext')
    };

    // Start with app switcher view
    switchView('switcher');

    initializeEventListeners();
    initializeVideoCarousel();
    adjustTextareaHeight(elements.userInput);
    initializeYouTubeHandlers();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopup);
