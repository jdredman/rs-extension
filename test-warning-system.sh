#!/bin/bash

# Chrome Extension Warning System Test Script
echo "🔍 Testing Chrome Extension Warning System..."

# Check if required files exist
echo "📁 Checking required files..."

if [ ! -f "manifest.json" ]; then
    echo "❌ manifest.json not found"
    exit 1
fi

if [ ! -f "content.js" ]; then
    echo "❌ content.js not found"
    exit 1
fi

if [ ! -f "content-styles.css" ]; then
    echo "❌ content-styles.css not found"
    exit 1
fi

echo "✅ All required files present"

# Validate manifest.json
echo "📋 Validating manifest.json..."
if grep -q "content_scripts" manifest.json; then
    echo "✅ Content scripts configuration found"
else
    echo "❌ Content scripts configuration missing"
fi

# Check for warning trigger keywords in content.js
echo "🔍 Checking warning implementation..."
if grep -q "WARNING_TRIGGERS" content.js; then
    echo "✅ Warning triggers configuration found"
else
    echo "❌ Warning triggers configuration missing"
fi

if grep -q "checkForWarnings" content.js; then
    echo "✅ Warning detection function found"
else
    echo "❌ Warning detection function missing"
fi

if grep -q "showBudgetWarning" content.js; then
    echo "✅ Budget warning function found"
else
    echo "❌ Budget warning function missing"
fi

if grep -q "showCreditCardWarning" content.js; then
    echo "✅ Credit card warning function found"
else
    echo "❌ Credit card warning function missing"
fi

# Check CSS classes
echo "🎨 Checking CSS styling..."
if grep -q "rs-budget-warning-wrapper" content-styles.css; then
    echo "✅ Budget warning styles found"
else
    echo "❌ Budget warning styles missing"
fi

if grep -q "rs-credit-card-warning-wrapper" content-styles.css; then
    echo "✅ Credit card warning styles found"
else
    echo "❌ Credit card warning styles missing"
fi

echo ""
echo "🚀 To test the extension:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select this directory"
echo "4. Navigate to the test pages to see warnings in action"
echo ""
echo "📄 Test pages available:"
echo "  - test-page.html (basic test)"
echo "  - warning-validation-test.html (comprehensive test)"
echo ""
echo "🔍 Extension should show:"
echo "  - Budget warning on pages with budget-related content"
echo "  - Credit card warning on pages mentioning credit cards"
echo "  - Warnings positioned at top center of page"
echo "  - Dismissible warnings that remember dismissal for 24 hours"
