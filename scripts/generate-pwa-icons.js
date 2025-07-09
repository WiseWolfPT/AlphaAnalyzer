#!/usr/bin/env node

/**
 * AGENTE D - PWA ICONS GENERATOR
 * Creates all required PWA icons from a base SVG or using Canvas
 */

import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_DIR = path.join(__dirname, '..', 'client', 'public');
const ICON_SIZES = [48, 72, 96, 144, 192, 512];

// Brand colors
const BRAND_COLOR = '#00ff00'; // Green
const BACKGROUND_COLOR = '#000000'; // Black
const TEXT_COLOR = '#ffffff'; // White

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Create PNG icon with Canvas
 */
function createPNGIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, size, size);

  // Border
  ctx.strokeStyle = BRAND_COLOR;
  ctx.lineWidth = size * 0.05;
  ctx.strokeRect(size * 0.1, size * 0.1, size * 0.8, size * 0.8);

  // Center symbol (stylized "A" for Alfalyzer)
  ctx.fillStyle = BRAND_COLOR;
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', size / 2, size / 2);

  // Small chart-like element
  ctx.strokeStyle = BRAND_COLOR;
  ctx.lineWidth = size * 0.02;
  const chartSize = size * 0.3;
  const chartX = size * 0.65;
  const chartY = size * 0.75;
  
  ctx.beginPath();
  ctx.moveTo(chartX, chartY);
  ctx.lineTo(chartX + chartSize * 0.3, chartY - chartSize * 0.2);
  ctx.lineTo(chartX + chartSize * 0.6, chartY - chartSize * 0.4);
  ctx.lineTo(chartX + chartSize, chartY - chartSize * 0.6);
  ctx.stroke();

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), buffer);
  
  console.log(`✅ Created: ${filename} (${size}x${size})`);
}

/**
 * Create maskable icon (with safe zone)
 */
function createMaskableIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Full background (for maskable)
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, size, size);

  // Safe zone (80% of size)
  const safeZone = size * 0.8;
  const offset = (size - safeZone) / 2;

  // Icon content within safe zone
  ctx.fillStyle = BRAND_COLOR;
  ctx.font = `bold ${safeZone * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', size / 2, size / 2);

  // Border within safe zone
  ctx.strokeStyle = BRAND_COLOR;
  ctx.lineWidth = safeZone * 0.04;
  ctx.strokeRect(offset, offset, safeZone, safeZone);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), buffer);
  
  console.log(`✅ Created: ${filename} (${size}x${size}) [maskable]`);
}

/**
 * Create favicon.ico
 */
function createFavicon() {
  const size = 32;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, size, size);

  // Simple "A" for favicon
  ctx.fillStyle = BRAND_COLOR;
  ctx.font = `bold ${size * 0.8}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'favicon.png'), buffer);
  
  console.log('✅ Created: favicon.png (32x32)');
}

/**
 * Create Apple touch icons
 */
function createAppleTouchIcon() {
  const size = 180;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background with rounded corners effect
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, size, size);

  // Apple-style rounded rectangle
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.roundRect(size * 0.05, size * 0.05, size * 0.9, size * 0.9, radius);
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fill();
  ctx.strokeStyle = BRAND_COLOR;
  ctx.lineWidth = size * 0.02;
  ctx.stroke();

  // Center content
  ctx.fillStyle = BRAND_COLOR;
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'apple-touch-icon.png'), buffer);
  
  console.log('✅ Created: apple-touch-icon.png (180x180)');
}

/**
 * Main generation function
 */
async function generateIcons() {
  console.log('🚀 Generating PWA icons for Alfalyzer...');
  console.log('─'.repeat(50));

  try {
    // Standard icons
    ICON_SIZES.forEach(size => {
      createPNGIcon(size, `icon-${size}x${size}.png`);
    });

    // Maskable icons
    [192, 512].forEach(size => {
      createMaskableIcon(size, `icon-maskable-${size}x${size}.png`);
    });

    // Favicon
    createFavicon();

    // Apple touch icon
    createAppleTouchIcon();

    console.log('─'.repeat(50));
    console.log('✨ PWA icons generated successfully!');
    console.log('📱 Icons are ready for installation');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

// Run generation
generateIcons();