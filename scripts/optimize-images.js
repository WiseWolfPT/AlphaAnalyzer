#!/usr/bin/env node

/**
 * AGENTE A - IMAGE OPTIMIZATION SCRIPT
 * Converts all PNG/JPG images to WebP format with optimization
 * Target: Reduce 21MB → ~6MB (70% reduction)
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INPUT_DIR = path.join(__dirname, '..', 'attached_assets');
const OUTPUT_DIR = path.join(__dirname, '..', 'client', 'public', 'images');
const QUALITY = 85; // WebP quality (80-90 for best balance)
const PROGRESSIVE = true;
const EFFORT = 6; // WebP effort level (0-6, higher = better compression)

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Optimization statistics
let stats = {
  totalOriginalSize: 0,
  totalOptimizedSize: 0,
  filesProcessed: 0,
  filesSkipped: 0,
  errors: 0
};

/**
 * Convert image to WebP with optimization
 * @param {string} inputPath - Path to source image
 * @param {string} outputPath - Path for optimized output
 */
async function optimizeImage(inputPath, outputPath) {
  try {
    const originalStats = fs.statSync(inputPath);
    stats.totalOriginalSize += originalStats.size;

    console.log(`🔄 Processing: ${path.basename(inputPath)} (${(originalStats.size / 1024 / 1024).toFixed(2)}MB)`);

    await sharp(inputPath)
      .webp({
        quality: QUALITY,
        progressive: PROGRESSIVE,
        effort: EFFORT,
        lossless: false,
        nearLossless: false,
        smartSubsample: true,
        reductionEffort: 6,
        mixed: true, // Allow mixed lossy/lossless
      })
      .toFile(outputPath);

    const optimizedStats = fs.statSync(outputPath);
    stats.totalOptimizedSize += optimizedStats.size;
    stats.filesProcessed++;

    const reduction = ((originalStats.size - optimizedStats.size) / originalStats.size * 100).toFixed(1);
    console.log(`✅ Optimized: ${path.basename(outputPath)} (${(optimizedStats.size / 1024 / 1024).toFixed(2)}MB, -${reduction}%)`);

  } catch (error) {
    stats.errors++;
    console.error(`❌ Error processing ${inputPath}:`, error.message);
  }
}

/**
 * Generate placeholder LQIP (Low Quality Image Placeholder)
 * @param {string} inputPath - Path to source image
 * @param {string} outputPath - Path for LQIP output
 */
async function generateLQIP(inputPath, outputPath) {
  try {
    const lqipPath = outputPath.replace('.webp', '.lqip.webp');
    
    await sharp(inputPath)
      .resize(20, 20, { fit: 'cover' }) // Tiny 20x20 placeholder
      .webp({
        quality: 20,
        effort: 1,
        progressive: false
      })
      .toFile(lqipPath);

    console.log(`📸 LQIP generated: ${path.basename(lqipPath)}`);
  } catch (error) {
    console.error(`❌ Error generating LQIP for ${inputPath}:`, error.message);
  }
}

/**
 * Process all images in directory
 */
async function processImages() {
  console.log('🚀 Starting image optimization...');
  console.log(`📁 Input: ${INPUT_DIR}`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  console.log(`⚙️  Quality: ${QUALITY}%, Progressive: ${PROGRESSIVE}, Effort: ${EFFORT}`);
  console.log('─'.repeat(60));

  try {
    const files = fs.readdirSync(INPUT_DIR);
    const imageFiles = files.filter(file => 
      /\.(png|jpg|jpeg|gif|bmp|tiff)$/i.test(file)
    );

    if (imageFiles.length === 0) {
      console.log('⚠️  No image files found in input directory');
      return;
    }

    console.log(`📊 Found ${imageFiles.length} images to process`);

    for (const file of imageFiles) {
      const inputPath = path.join(INPUT_DIR, file);
      const baseName = path.parse(file).name;
      const outputPath = path.join(OUTPUT_DIR, `${baseName}.webp`);

      // Skip if already processed and output is newer
      if (fs.existsSync(outputPath)) {
        const inputStats = fs.statSync(inputPath);
        const outputStats = fs.statSync(outputPath);
        if (outputStats.mtime > inputStats.mtime) {
          console.log(`⏭️  Skipping: ${file} (already optimized)`);
          stats.filesSkipped++;
          continue;
        }
      }

      await optimizeImage(inputPath, outputPath);
      
      // Generate LQIP for lazy loading
      await generateLQIP(inputPath, outputPath);
    }

  } catch (error) {
    console.error('❌ Error reading input directory:', error.message);
    process.exit(1);
  }
}

/**
 * Print optimization summary
 */
function printSummary() {
  console.log('─'.repeat(60));
  console.log('📊 OPTIMIZATION SUMMARY');
  console.log('─'.repeat(60));
  console.log(`📁 Files processed: ${stats.filesProcessed}`);
  console.log(`⏭️  Files skipped: ${stats.filesSkipped}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log('');
  
  if (stats.filesProcessed > 0) {
    const originalMB = (stats.totalOriginalSize / 1024 / 1024).toFixed(2);
    const optimizedMB = (stats.totalOptimizedSize / 1024 / 1024).toFixed(2);
    const totalReduction = ((stats.totalOriginalSize - stats.totalOptimizedSize) / stats.totalOriginalSize * 100).toFixed(1);
    const savedMB = (originalMB - optimizedMB).toFixed(2);
    
    console.log(`📦 Original size: ${originalMB} MB`);
    console.log(`📦 Optimized size: ${optimizedMB} MB`);
    console.log(`💾 Size saved: ${savedMB} MB (${totalReduction}% reduction)`);
    
    if (parseFloat(totalReduction) >= 70) {
      console.log('🎯 TARGET ACHIEVED: >70% reduction!');
    } else if (parseFloat(totalReduction) >= 50) {
      console.log('✅ Good reduction achieved');
    } else {
      console.log('⚠️  Consider adjusting quality settings for better compression');
    }
  }
  
  console.log('─'.repeat(60));
  console.log('✨ Image optimization complete!');
}

// Run optimization
processImages()
  .then(printSummary)
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });