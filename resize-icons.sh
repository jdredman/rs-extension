#!/bin/bash

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed. Please install it first."
    echo "You can install it with: brew install imagemagick"
    exit 1
fi

# Source image name
SOURCE="ramsey-logo.png"

# Make sure we're in the images directory
cd "$(dirname "$0")/images" || exit 1

# Create different sizes from the source image
convert "$SOURCE" -resize 16x16 icon16.png
convert "$SOURCE" -resize 48x48 icon48.png
convert "$SOURCE" -resize 128x128 icon128.png

echo "Icons generated successfully!"
