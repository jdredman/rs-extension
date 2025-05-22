#!/bin/bash

# Check if imagemagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed. Please install it first."
    echo "You can install it with: brew install imagemagick"
    exit 1
fi

# Convert SVG to different sized PNGs
convert -background none -resize 16x16 images/icon.svg images/icon16.png
convert -background none -resize 48x48 images/icon.svg images/icon48.png
convert -background none -resize 128x128 images/icon.svg images/icon128.png

echo "Icons generated successfully!"
