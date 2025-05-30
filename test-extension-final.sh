#!/bin/bash

# Test Chrome Extension Loading and Functionality
# This script helps verify the extension can be loaded in Chrome

echo "🔍 Chrome Extension Test Script"
echo "================================"

# Check if required files exist
echo "📁 Checking required files..."

required_files=("manifest.json" "popup.html" "popup.js" "style.css" "background.js")
missing_files=()

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo ""
    echo "🎉 All required files present!"
else
    echo ""
    echo "⚠️  Missing files: ${missing_files[*]}"
    exit 1
fi

# Check for syntax errors in JavaScript files
echo ""
echo "🔍 Checking JavaScript syntax..."

for js_file in popup.js background.js; do
    if command -v node &> /dev/null; then
        if node -c "$js_file" 2>/dev/null; then
            echo "✅ $js_file syntax OK"
        else
            echo "❌ $js_file has syntax errors"
            node -c "$js_file"
        fi
    else
        echo "⚠️  Node.js not found, skipping syntax check for $js_file"
    fi
done

# Check manifest.json validity
echo ""
echo "🔍 Checking manifest.json..."

if command -v python3 &> /dev/null; then
    if python3 -m json.tool manifest.json > /dev/null 2>&1; then
        echo "✅ manifest.json is valid JSON"
    else
        echo "❌ manifest.json has JSON syntax errors"
    fi
elif command -v jq &> /dev/null; then
    if jq . manifest.json > /dev/null 2>&1; then
        echo "✅ manifest.json is valid JSON"
    else
        echo "❌ manifest.json has JSON syntax errors"
    fi
else
    echo "⚠️  No JSON validator found, skipping manifest.json check"
fi

# Test HTML files
echo ""
echo "🔍 Testing HTML files..."

for html_file in popup.html; do
    if [ -f "$html_file" ]; then
        # Basic HTML validation - check for opening and closing tags
        if grep -q "<!DOCTYPE html>" "$html_file" && grep -q "</html>" "$html_file"; then
            echo "✅ $html_file has proper HTML structure"
        else
            echo "⚠️  $html_file may have HTML structure issues"
        fi
    fi
done

echo ""
echo "🚀 Extension Loading Instructions:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' in the top right"
echo "3. Click 'Load unpacked' and select this folder:"
echo "   $(pwd)"
echo "4. The extension should appear in your extensions list"
echo ""
echo "🧪 Testing Instructions:"
echo "1. Click the extension icon in Chrome toolbar"
echo "2. Try asking a budgeting question like 'How do I start budgeting?'"
echo "3. Verify that link previews appear as formatted cards, not raw HTML"
echo ""

# Check if Chrome is available for auto-loading
if command -v google-chrome &> /dev/null || command -v chrome &> /dev/null || command -v "Google Chrome" &> /dev/null; then
    echo "💡 To auto-load the extension (experimental):"
    echo "   Run: open -a 'Google Chrome' --args --load-extension='$(pwd)'"
else
    echo "💡 Chrome not found in PATH, manual loading required"
fi

echo ""
echo "✨ Extension validation complete!"
