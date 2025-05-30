#!/bin/bash

echo "🎯 Final Chrome Extension Check"
echo "=============================="

# Check core files
echo "📁 Checking core files..."
required_files=("manifest.json" "popup.html" "popup.js" "style.css" "background.js" "content.js")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file found"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check images directory
if [ -d "images" ]; then
    echo "✅ images/ directory found"
    icon_count=$(find images -name "*.png" | wc -l)
    echo "   📊 Found $icon_count icon files"
else
    echo "❌ images/ directory missing"
    exit 1
fi

# Check for syntax errors
echo ""
echo "🔍 Checking for syntax errors..."
node -c popup.js && echo "✅ popup.js syntax OK" || (echo "❌ popup.js has syntax errors" && exit 1)

# Check manifest version
echo ""
echo "📋 Checking manifest..."
manifest_version=$(grep '"manifest_version"' manifest.json | grep -o '[0-9]')
if [ "$manifest_version" = "3" ]; then
    echo "✅ Using Manifest V3"
else
    echo "❌ Not using Manifest V3"
    exit 1
fi

# Check for key functions
echo ""
echo "🔧 Checking key functionality..."
if grep -q "formatAssistantMessage" popup.js; then
    echo "✅ formatAssistantMessage function found"
else
    echo "❌ formatAssistantMessage function missing"
    exit 1
fi

if grep -q "search_ramsey_resources" popup.js; then
    echo "✅ search_ramsey_resources function found"
else
    echo "❌ search_ramsey_resources function missing"
    exit 1
fi

if grep -q "createLinkPreview" popup.js; then
    echo "✅ createLinkPreview function found"
else
    echo "❌ createLinkPreview function missing"
    exit 1
fi

# Check for HTML placeholder fix
if grep -q "__HTML_BLOCK_" popup.js; then
    echo "✅ HTML placeholder fix implemented"
else
    echo "❌ HTML placeholder fix missing"
    exit 1
fi

echo ""
echo "🎉 All checks passed! Extension is ready for testing."
echo ""
echo "🚀 Next steps:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked' and select this folder"
echo "4. Test the extension with sample queries like:"
echo "   - 'How do I start budgeting?'"
echo "   - 'What is the debt snowball method?'"
echo "   - 'Help me build an emergency fund'"
