// Test script to verify warning functionality
console.log('Testing warning system...');

// Test budget warning detection
const budgetKeywords = ['budget', 'budgeting', 'financial planning'];
const creditCardKeywords = ['credit card', 'credit cards', 'credit card debt'];

// Check if page content contains trigger words
const pageText = document.body.textContent.toLowerCase();
console.log('Page text preview:', pageText.substring(0, 200) + '...');

// Test budget triggers
const budgetDetected = budgetKeywords.some(keyword => pageText.includes(keyword));
console.log('Budget keywords detected:', budgetDetected);

// Test credit card triggers  
const creditCardDetected = creditCardKeywords.some(keyword => pageText.includes(keyword));
console.log('Credit card keywords detected:', creditCardDetected);

// Check if warnings are showing
setTimeout(() => {
    const budgetWarning = document.querySelector('.rs-budget-warning-wrapper');
    const creditCardWarning = document.querySelector('.rs-credit-card-warning-wrapper');
    
    console.log('Budget warning visible:', !!budgetWarning);
    console.log('Credit card warning visible:', !!creditCardWarning);
}, 1000);
