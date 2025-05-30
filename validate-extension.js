/**
 * Simple validation script to test the formatAssistantMessage function
 * This ensures the HTML preview fix is working correctly
 */

// Mock the formatMarkdownText function for testing
function formatMarkdownText(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
        .replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
}

// The formatAssistantMessage function from popup.js
function formatAssistantMessage(text) {
    if (text.includes('<div class="link-preview">') || text.includes('<div class="youtube-embed">')) {
        const htmlBlocks = [];
        const placeholders = [];
        
        let tempText = text;
        const htmlRegex = /<div class="(?:link-preview|youtube-embed)"[\s\S]*?<\/div>/g;
        let match;
        let index = 0;
        
        while ((match = htmlRegex.exec(text)) !== null) {
            const placeholder = `__HTML_BLOCK_${index}__`;
            htmlBlocks.push(match[0]);
            placeholders.push(placeholder);
            tempText = tempText.replace(match[0], placeholder);
            index++;
        }
        
        let formatted = formatMarkdownText(tempText);
        
        for (let i = 0; i < placeholders.length; i++) {
            formatted = formatted.replace(placeholders[i], htmlBlocks[i]);
        }
        
        return formatted;
    }
    
    return formatMarkdownText(text);
}

// Test cases
console.log('Testing formatAssistantMessage function...\n');

// Test 1: Regular text with markdown
const test1 = "Here are some **important** tips about budgeting:\n- Create a monthly budget\n- Track your expenses";
console.log('Test 1 - Regular markdown:');
console.log('Input:', test1);
console.log('Output:', formatAssistantMessage(test1));
console.log('✓ Should show formatted markdown with HTML tags\n');

// Test 2: Mixed content with HTML link preview
const test2 = `Here's some helpful information about budgeting:

**Dave Ramsey's budgeting advice** is very practical. You should check out this resource:

<div class="link-preview">
<img src="https://example.com/image.jpg" alt="Preview" class="preview-image">
<div class="preview-content">
<h3 class="preview-title">How to Budget - Dave Ramsey</h3>
<p class="preview-description">Learn the basics of budgeting with Dave Ramsey's proven method.</p>
<span class="preview-domain">ramseysolutions.com</span>
</div>
</div>

This should help you get started with your budget!`;

console.log('Test 2 - Mixed content with link preview:');
console.log('Input length:', test2.length);
console.log('Output:', formatAssistantMessage(test2));
console.log('✓ Should show formatted text with intact HTML preview\n');

// Test 3: YouTube embed
const test3 = `Check out this great video about debt:

<div class="youtube-embed">
<iframe src="https://www.youtube.com/embed/abc123" frameborder="0" allowfullscreen></iframe>
<div class="video-info">
<h4>How to Pay Off Debt Fast</h4>
<p>Dave Ramsey explains the debt snowball method</p>
</div>
</div>

The debt snowball method really works!`;

console.log('Test 3 - YouTube embed:');
console.log('Input length:', test3.length);
console.log('Output:', formatAssistantMessage(test3));
console.log('✓ Should show formatted text with intact YouTube embed\n');

console.log('All tests completed! 🎉');
