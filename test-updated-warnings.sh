#!/bin/bash

# Updated test script for the refined warning system
echo "🧪 Testing Updated Warning System..."

echo ""
echo "📋 Testing Budget Warning Refinements:"
echo "✅ Budget warning should say 'Not enough in your budget!'"
echo "✅ Should only trigger on product/cart pages, not blog posts with prices"
echo "✅ Credit card warning unchanged"

echo ""
echo "🔍 Checking updated triggers..."

# Check if the refined triggers are in place
if grep -q "add to cart\|buy now\|item details" content.js; then
    echo "✅ Product page triggers found"
else
    echo "❌ Product page triggers missing"
fi

# Check if generic price triggers were removed
if grep -q "\\\$\|price" content.js; then
    echo "❌ Generic price triggers still present (should be removed)"
else
    echo "✅ Generic price triggers removed"
fi

# Check the updated warning message
if grep -q "Not enough in your budget" content.js; then
    echo "✅ Updated budget warning message found"
else
    echo "❌ Updated budget warning message missing"
fi

# Check that future capabilities mention was removed
if grep -q "Future versions will check" content.js; then
    echo "❌ Future capabilities mention still present (should be removed)"
else
    echo "✅ Future capabilities mention removed"
fi

echo ""
echo "🧪 Test Pages Available:"
echo "  - product-page-test.html (should show budget warning)"
echo "  - shopping-cart-test.html (should show budget warning)"
echo "  - blog-post-test.html (should NOT show budget warning)"
echo "  - stacking-test.html (should show both warnings)"

echo ""
echo "🎯 Expected Results:"
echo "  Budget Warning: 'Not enough in your budget!'"
echo "  Triggers: Only on product/cart pages with purchase buttons"
echo "  Behavior: Session-only dismissal, auto-timeout after 10s"

echo ""
echo "✅ Updated warning system ready for testing!"
