#!/usr/bin/env node

/**
 * Image Analysis Script for Alfalyzer
 * Analyzes existing images and provides optimization recommendations
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  supportedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'],
  scanPaths: [
    'attached_assets',
    'client/public',
    'client/src/assets',
    'public'
  ]
};

/**
 * Get all image files from specified directories
 */
async function findImages() {
  const images = [];
  
  for (const scanPath of CONFIG.scanPaths) {
    try {
      const fullPath = path.join(process.cwd(), scanPath);
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);
      
      if (!exists) {
        console.log(`📁 Directory not found: ${scanPath}`);
        continue;
      }
      
      console.log(`🔍 Scanning: ${scanPath}`);
      const files = await scanDirectory(fullPath);
      
      for (const file of files) {
        const ext = path.extname(file.name).toLowerCase();
        if (CONFIG.supportedFormats.includes(ext)) {
          images.push({
            ...file,
            relativePath: path.relative(process.cwd(), file.path),
            extension: ext,
            sizeKB: (file.size / 1024).toFixed(1)
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not scan directory ${scanPath}:`, error.message);
    }
  }
  
  return images;
}

/**
 * Recursively scan directory for files
 */
async function scanDirectory(dir) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await scanDirectory(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          size: stat.size,
          modified: stat.mtime
        });
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not scan ${dir}:`, error.message);
  }
  
  return files;
}

/**
 * Analyze image optimization potential
 */
function analyzeOptimizationPotential(images) {
  const analysis = {
    totalImages: images.length,
    totalSizeKB: 0,
    formats: {},
    recommendations: []
  };
  
  for (const image of images) {
    analysis.totalSizeKB += parseFloat(image.sizeKB);
    
    const format = image.extension.replace('.', '');
    analysis.formats[format] = (analysis.formats[format] || 0) + 1;
    
    // Generate recommendations
    if (format === 'png' && parseFloat(image.sizeKB) > 100) {
      analysis.recommendations.push({
        file: image.relativePath,
        current: format,
        recommended: 'webp',
        reason: 'Large PNG can be significantly reduced with WebP',
        estimatedSavings: '60-80%'
      });
    } else if (format === 'jpg' || format === 'jpeg') {
      analysis.recommendations.push({
        file: image.relativePath,
        current: format,
        recommended: 'webp',
        reason: 'JPEG can be optimized with WebP format',
        estimatedSavings: '30-50%'
      });
    }
  }
  
  return analysis;
}

/**
 * Generate optimization plan
 */
function generateOptimizationPlan(analysis) {
  const plan = {
    immediate: [],
    future: [],
    estimatedSavings: 0
  };
  
  // Immediate optimizations (existing images)
  for (const rec of analysis.recommendations) {
    plan.immediate.push({
      action: 'convert',
      file: rec.file,
      from: rec.current,
      to: rec.recommended,
      priority: rec.current === 'png' ? 'high' : 'medium',
      estimatedSavings: rec.estimatedSavings
    });
  }
  
  // Future optimizations
  plan.future.push({
    action: 'implement_lazy_loading',
    description: 'Add lazy loading to all images below the fold',
    impact: 'Reduce initial page load time by 40-60%'
  });
  
  plan.future.push({
    action: 'add_blur_placeholders',
    description: 'Implement blur placeholders to prevent layout shift',
    impact: 'Improve Cumulative Layout Shift (CLS) score'
  });
  
  plan.future.push({
    action: 'setup_responsive_images',
    description: 'Generate multiple sizes for different screen sizes',
    impact: 'Reduce mobile data usage by 50-70%'
  });
  
  return plan;
}

/**
 * Main analysis function
 */
async function main() {
  console.log('🔍 Starting image analysis for Alfalyzer...\n');
  
  try {
    // Find all images
    const images = await findImages();
    
    if (images.length === 0) {
      console.log('📭 No images found in the specified directories.');
      return;
    }
    
    console.log(`\n📊 Image Analysis Results:`);
    console.log(`   Total images found: ${images.length}`);
    
    // Analyze optimization potential
    const analysis = analyzeOptimizationPotential(images);
    
    console.log(`   Total size: ${analysis.totalSizeKB.toFixed(1)} KB`);
    console.log(`   Average size: ${(analysis.totalSizeKB / analysis.totalImages).toFixed(1)} KB per image\n`);
    
    // Format breakdown
    console.log('📈 Format Distribution:');
    for (const [format, count] of Object.entries(analysis.formats)) {
      console.log(`   ${format.toUpperCase()}: ${count} files`);
    }
    
    // List all images
    console.log('\n📋 Image Inventory:');
    images.sort((a, b) => parseFloat(b.sizeKB) - parseFloat(a.sizeKB));
    
    for (const image of images) {
      const sizeIndicator = parseFloat(image.sizeKB) > 100 ? '🔴' : 
                           parseFloat(image.sizeKB) > 50 ? '🟡' : '🟢';
      console.log(`   ${sizeIndicator} ${image.relativePath} (${image.sizeKB} KB)`);
    }
    
    // Optimization recommendations
    if (analysis.recommendations.length > 0) {
      console.log('\n💡 Optimization Recommendations:');
      for (const rec of analysis.recommendations) {
        console.log(`   📄 ${rec.file}`);
        console.log(`      ${rec.current.toUpperCase()} → ${rec.recommended.toUpperCase()}`);
        console.log(`      ${rec.reason}`);
        console.log(`      💾 Estimated savings: ${rec.estimatedSavings}\n`);
      }
    }
    
    // Generate and display optimization plan
    const plan = generateOptimizationPlan(analysis);
    
    console.log('🎯 Optimization Plan:');
    console.log('\n   Immediate Actions:');
    for (const action of plan.immediate) {
      const priority = action.priority === 'high' ? '🔴' : '🟡';
      console.log(`   ${priority} Convert ${action.file} to ${action.to.toUpperCase()}`);
    }
    
    console.log('\n   Future Enhancements:');
    for (const enhancement of plan.future) {
      console.log(`   ✨ ${enhancement.description}`);
      console.log(`      Impact: ${enhancement.impact}`);
    }
    
    // Implementation commands
    console.log('\n🚀 Next Steps:');
    console.log('   1. Install Sharp for image processing:');
    console.log('      npm install sharp');
    console.log('   2. Run the full conversion script:');
    console.log('      node scripts/convert-images-to-webp.js');
    console.log('   3. Update components to use OptimizedImage:');
    console.log('      import { OptimizedImage } from "../components/ui/optimized-image"');
    console.log('   4. Test the image proxy service:');
    console.log('      curl "http://localhost:3000/api/image/proxy?url=..."');
    
    // Estimated impact
    const estimatedTotalSavings = analysis.recommendations.length * 0.6; // 60% average
    console.log(`\n📊 Estimated Impact:`);
    console.log(`   💾 Potential size reduction: ${(analysis.totalSizeKB * estimatedTotalSavings).toFixed(1)} KB`);
    console.log(`   🚀 Page load improvement: 40-60% faster`);
    console.log(`   📱 Mobile experience: Significantly improved`);
    console.log(`   🎯 Core Web Vitals: Better LCP and CLS scores`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };