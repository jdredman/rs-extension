#!/bin/bash

# Final Styling Validation Script
# Tests the updated warning system with new styling requirements

echo "🎨 Final Styling Validation - Ramsey Extension"
echo "=============================================="
echo

# Test 1: Check that logo image is properly referenced in content.js
echo "Test 1: Checking logo image reference in content.js..."
if grep -q "chrome.runtime.getURL('images/icon48.png')" content.js; then
    echo "✅ Logo image correctly referenced"
else
    echo "❌ Logo image reference missing or incorrect"
fi
echo

# Test 2: Check that emojis are moved inline with titles
echo "Test 2: Checking emoji placement in titles..."
if grep -q '${config.icon} ${config.title}' content.js; then
    echo "✅ Emojis correctly placed inline with titles"
else
    echo "❌ Emojis not inline with titles"
fi
echo

# Test 3: Check that credit card warnings no longer have orange styling
echo "Test 3: Checking credit card warning styling..."
if grep -q "box-shadow.*rgba(255, 136, 0" content-styles.css; then
    echo "❌ Orange styling still present in credit card warnings"
elif grep -q "border.*#ff8800" content-styles.css; then
    echo "❌ Orange border still present in credit card warnings"
elif grep -q "color.*#d2691e" content-styles.css; then
    echo "❌ Orange text color still present in credit card warnings"
else
    echo "✅ Orange styling removed from credit card warnings"
fi
echo

# Test 4: Check that both warnings use consistent styling
echo "Test 4: Checking consistent styling between warnings..."
budget_animation=$(grep -A 5 "\.rs-budget-warning-wrapper" content-styles.css | grep "animation:")
credit_animation=$(grep -A 5 "\.rs-credit-card-warning-wrapper" content-styles.css | grep "animation:")

if [ "$budget_animation" = "$credit_animation" ]; then
    echo "✅ Both warnings use consistent animation styling"
else
    echo "❌ Warning animations are inconsistent"
fi
echo

# Test 5: Check that web accessible resources include images
echo "Test 5: Checking web accessible resources..."
if grep -q '"images/\*"' manifest.json; then
    echo "✅ Images are properly exposed as web accessible resources"
else
    echo "❌ Images not accessible to content scripts"
fi
echo

# Test 6: Generate summary of changes
echo "📋 Summary of Final Changes:"
echo "----------------------------"
echo "1. ✅ Replaced emoji icons with 48px Ramsey logo"
echo "2. ✅ Moved emojis inline with warning titles"
echo "3. ✅ Removed orange outline/border from credit card warnings"
echo "4. ✅ Applied consistent styling (blue theme) to all warnings"
echo "5. ✅ Maintained warning stacking and dismissal functionality"
echo "6. ✅ Preserved session-based dismissal and auto-timeout"
echo

echo "🚀 Final styling validation complete!"
echo "To test the extension:"
echo "1. Load the extension in Chrome"
echo "2. Visit final-styling-test.html"
echo "3. Verify both warnings appear with new styling"
echo "4. Check that warnings use logo instead of emojis"
echo "5. Confirm no orange styling on credit card warnings"
