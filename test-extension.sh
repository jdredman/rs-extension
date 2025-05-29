#!/bin/bash

echo "Testing Ramsey Solutions Chrome Extension"
echo "========================================"

# Check if files exist
if [ ! -f "manifest.json" ]; then
    echo "❌ manifest.json not found"
    exit 1
fi

if [ ! -f "popup.js" ]; then
    echo "❌ popup.js not found"
    exit 1
fi

if [ ! -f "popup.html" ]; then
    echo "❌ popup.html not found"
    exit 1
fi

echo "✅ All required files found"

# Check video carousel configuration
echo ""
echo "Video Carousel Configuration:"
echo "============================="

# Extract video count from popup.js
video_count=$(grep -c "id: 'ramsey" popup.js)
echo "📹 Total videos in RAMSEY_VIDEOS: $video_count"

# Extract items visible
items_visible=$(grep "itemsVisible:" popup.js | grep -o '[0-9]\+' | head -1)
echo "👁️  Items visible at once: $items_visible"

# Calculate expected positions
if [ "$video_count" -gt 0 ] && [ "$items_visible" -gt 0 ]; then
    max_index=$((video_count - items_visible))
    if [ $max_index -lt 0 ]; then
        max_index=0
    fi
    positions=$((max_index + 1))
    echo "🎯 Maximum scroll index: $max_index"
    echo "📍 Total scroll positions: $positions"
    
    if [ "$video_count" -le "$items_visible" ]; then
        echo "ℹ️  All videos fit in view - no scrolling needed"
    else
        echo "⏭️  Scrolling required to see all videos"
    fi
fi

echo ""
echo "🔄 To test the extension:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked' and select this directory"
echo "4. Click the extension icon in the toolbar"
echo "5. Test the video carousel navigation"

echo ""
echo "📋 Expected carousel behavior:"
echo "- Videos should scroll smoothly left/right"
echo "- All $video_count videos should be accessible"
echo "- Navigation buttons should disable at start/end"
echo "- Console logs will show scroll positions"
echo "5. Click on the extension icon in the Chrome toolbar to see your Hello World sidebar"
echo ""
echo "To make changes to your extension:"
echo "1. Edit the files as needed"
echo "2. Return to the chrome://extensions/ page"
echo "3. Click the refresh icon on your extension's card to update it"
echo ""
echo "Happy developing!"
