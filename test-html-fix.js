// Test script to validate the HTML formatting fix
// This simulates the exact scenarios where HTML fragments were appearing broken

// Copy the functions from popup.js for testing
function createLinkCard(title, description, url) {
    return `
        <a href="${url}" target="_blank" class="link-preview">
            <div class="link-title">${title}</div>
            <div class="link-description">${description}</div>
            <div class="link-url">${url}</div>
        </a>
    `;
}

function createYouTubeEmbed(videoId) {
    return `
        <div style="margin: 10px 0;">
            <iframe width="300" height="169" src="https://www.youtube.com/embed/${videoId}" 
                    frameborder="0" allowfullscreen style="border-radius: 8px;"></iframe>
        </div>
    `;
}

function formatAssistantMessage(text) {
    console.log('🔍 Processing text:', text);
    
    const htmlRegex = /<HTML>(.*?)<\/HTML>/gs;
    const matches = Array.from(text.matchAll(htmlRegex));
    
    console.log('📊 Found matches:', matches.length);
    
    if (matches.length === 0) {
        console.log('✅ No HTML blocks found, returning original text');
        return text;
    }
    
    let result = text;
    
    // Process matches in reverse order to maintain correct positions
    for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const fullMatch = match[0];  // e.g., "<HTML>link_card(...)</HTML>"
        const htmlContent = match[1]; // e.g., "link_card(...)"
        const startPos = match.index;
        const endPos = startPos + fullMatch.length;
        
        console.log(`🔧 Processing match ${i + 1}:`, htmlContent);
        
        let replacement = '';
        
        if (htmlContent.startsWith('link_card(')) {
            const linkMatch = htmlContent.match(/link_card\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\)/);
            if (linkMatch) {
                replacement = createLinkCard(linkMatch[1], linkMatch[2], linkMatch[3]);
                console.log('🔗 Created link card for:', linkMatch[1]);
            }
        } else if (htmlContent.startsWith('youtube_embed(')) {
            const youtubeMatch = htmlContent.match(/youtube_embed\("([^"]+)"\)/);
            if (youtubeMatch) {
                replacement = createYouTubeEmbed(youtubeMatch[1]);
                console.log('📺 Created YouTube embed for:', youtubeMatch[1]);
            }
        }
        
        // Use substring to replace the exact match
        result = result.substring(0, startPos) + replacement + result.substring(endPos);
        console.log(`✂️ Replaced HTML block ${i + 1}`);
    }
    
    console.log('🎉 Final result length:', result.length);
    return result;
}

// Test cases that reproduce the original broken HTML issue
const testCases = [
    {
        name: "Single HTML Block (Original Issue)",
        input: `Here's what I found about Ramsey Solutions:

<HTML>link_card("Dave Ramsey's 7 Baby Steps", "Complete guide to financial freedom using Dave Ramsey's proven method", "https://www.ramseysolutions.com/dave-ramsey-7-baby-steps")</HTML>

This is a comprehensive financial plan that will help you achieve financial peace.`
    },
    {
        name: "Multiple HTML Blocks (Complex Scenario)",
        input: `Here are several Ramsey Solutions resources:

<HTML>link_card("Emergency Fund Guide", "How to build your starter emergency fund", "https://www.ramseysolutions.com/saving/emergency-fund")</HTML>

Dave Ramsey recommends starting with $1,000.

<HTML>link_card("Debt Snowball Method", "Step-by-step debt elimination strategy", "https://www.ramseysolutions.com/debt/debt-snowball-method")</HTML>

<HTML>youtube_embed("dQw4w9WgXcQ")</HTML>

These tools will help you become debt-free.`
    },
    {
        name: "Search Results Scenario (Real Use Case)",
        input: `I found these resources about budgeting:

<HTML>link_card("EveryDollar Budget Tool", "Free budgeting app by Ramsey Solutions", "https://www.everydollar.com")</HTML>

<HTML>link_card("Budget Percentages Guide", "How to allocate your income", "https://www.ramseysolutions.com/budgeting/budget-percentages")</HTML>`
    }
];

console.log('🚀 Starting HTML Formatting Fix Validation');
console.log('=' .repeat(50));

let allTestsPassed = true;

testCases.forEach((testCase, index) => {
    console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
    console.log('-'.repeat(40));
    
    const result = formatAssistantMessage(testCase.input);
    
    // Validation checks
    const hasUnprocessedHTML = result.includes('<HTML>') || result.includes('</HTML>');
    const hasUnprocessedFunctions = result.includes('link_card(') || result.includes('youtube_embed(');
    const hasGeneratedHTML = result.includes('class="link-preview"') || result.includes('<iframe');
    
    if (hasUnprocessedHTML) {
        console.error('❌ FAIL: Still contains unprocessed HTML tags');
        allTestsPassed = false;
    }
    
    if (hasUnprocessedFunctions) {
        console.error('❌ FAIL: Still contains unprocessed function calls');
        allTestsPassed = false;
    }
    
    if (testCase.input.includes('<HTML>') && !hasGeneratedHTML) {
        console.error('❌ FAIL: Expected HTML generation but none found');
        allTestsPassed = false;
    }
    
    if (!hasUnprocessedHTML && !hasUnprocessedFunctions && (testCase.input.includes('<HTML>') ? hasGeneratedHTML : true)) {
        console.log('✅ PASS: HTML formatting working correctly');
    }
});

console.log('\n' + '=' .repeat(50));
if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! The HTML formatting fix is working correctly.');
    console.log('✅ No more broken HTML fragments should appear in the extension.');
} else {
    console.log('💥 SOME TESTS FAILED! Check the output above for details.');
}
console.log('=' .repeat(50));
