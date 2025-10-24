#!/bin/bash

# Screenshot Script for Reentry Map
# Takes screenshots at multiple viewport sizes for design review

set -e

# Configuration
URL="${1:-http://localhost:3003}"
OUTPUT_DIR="${2:-/tmp/reentry-map-screenshots}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "📸 Taking screenshots of: $URL"
echo "📁 Output directory: $OUTPUT_DIR"
echo ""

# Define viewports: name, width, height
viewports=(
  "mobile:375:667"
  "mobile-large:414:896"
  "tablet:768:1024"
  "desktop:1280:800"
  "desktop-large:1920:1080"
)

# Take screenshots for each viewport
for viewport in "${viewports[@]}"; do
  IFS=':' read -r name width height <<< "$viewport"

  echo "📱 Capturing $name (${width}x${height})..."

  # Full page screenshot
  npx playwright screenshot \
    --browser chromium \
    --viewport-size "${width},${height}" \
    --full-page \
    "$URL" \
    "$OUTPUT_DIR/${name}_${TIMESTAMP}_full.png" \
    2>/dev/null || echo "  ⚠️  Failed to capture $name"

  # Above-the-fold screenshot
  npx playwright screenshot \
    --browser chromium \
    --viewport-size "${width},${height}" \
    "$URL" \
    "$OUTPUT_DIR/${name}_${TIMESTAMP}_viewport.png" \
    2>/dev/null || echo "  ⚠️  Failed to capture $name viewport"
done

echo ""
echo "✅ Screenshots saved to: $OUTPUT_DIR"
echo ""
echo "📋 Files:"
ls -lh "$OUTPUT_DIR"/*"${TIMESTAMP}"* 2>/dev/null || echo "No files found"
