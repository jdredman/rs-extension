#!/bin/bash

# Ramsey Solutions URL Exclusion Test
# Validates that warnings are properly suppressed on ramseysolutions.com

echo "🚫 Ramsey Solutions URL Exclusion Test"
echo "====================================="
echo

# Test 1: Check that exclusion code is present
echo "Test 1: Checking for ramseysolutions.com exclusion in content.js..."
if grep -q "ramseysolutions.com" content.js; then
    echo "✅ Ramsey Solutions URL exclusion found"
    # Show the exact exclusion code
    echo "   Code: $(grep -A 3 "ramseysolutions.com" content.js | head -3)"
else
    echo "❌ Ramsey Solutions URL exclusion NOT found"
fi
echo

# Test 2: Check exclusion placement
echo "Test 2: Checking exclusion placement in checkForWarnings function..."
if grep -A 5 "function checkForWarnings" content.js | grep -q "ramseysolutions.com"; then
    echo "✅ Exclusion properly placed at start of checkForWarnings function"
else
    echo "❌ Exclusion not found in checkForWarnings function"
fi
echo

# Test 3: Check for early return
echo "Test 3: Checking for early return statement..."
if grep -A 3 "ramseysolutions.com" content.js | grep -q "return;"; then
    echo "✅ Early return statement found - function will exit without showing warnings"
else
    echo "❌ Early return statement missing - warnings might still appear"
fi
echo

# Test 4: Verify other Ramsey domains are included
echo "Test 4: Suggested additional Ramsey domains to exclude:"
echo "   - everydollar.com (budget app)"
echo "   - daveramsey.com (legacy domain)"
echo "   - financialpeace.com (course platform)"
echo "   Consider adding these for complete coverage"
echo

# Test 5: Generate test commands
echo "Test 5: Manual Testing Instructions:"
echo "   1. Load extension in Chrome"
echo "   2. Navigate to: https://www.ramseysolutions.com/store"
echo "   3. Look for shopping cart triggers (should not show budget warning)"
echo "   4. Navigate to: https://www.ramseysolutions.com/store/checkout"
echo "   5. Look for payment forms (should not show credit card warning)"
echo "   6. Test local file: file://$(pwd)/ramsey-exclusion-test.html"
echo "      (should show warnings since it's not on ramseysolutions.com)"
echo

echo "📋 Summary:"
echo "----------"
echo "The extension now excludes ramseysolutions.com from showing warnings"
echo "This prevents the extension from showing warnings on the company's own website"
echo "Test with both ramseysolutions.com URLs and other domains to verify functionality"
echo

echo "🧪 Quick Test Command:"
echo "open -a 'Google Chrome' 'https://www.ramseysolutions.com/store'"
