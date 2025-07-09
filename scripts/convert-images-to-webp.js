#!/usr/bin/env node

/**
 * Image Conversion Script for Alfalyzer
 * Converts all images in the project to WebP format with optimization
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  quality: 85,
  effort: 6, // Maximum compression effort
  keepOriginals: true, // Keep original files
  outputDir: 'client/public/assets/images', // Centralized image directory
  supportedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'],
  generateResponsive: true, // Generate responsive variants
  responsiveWidths: [320, 480, 640, 768, 1024, 1280, 1920],
  generatePlaceholder: true // Generate blur placeholders
};

// Paths to scan for images
const SCAN_PATHS = [
  'attached_assets',
  'client/public',
  'client/src/assets',
  'public'
];

/**
 * Get all image files from specified directories
 */
async function findImages() {
  const images = [];
  
  for (const scanPath of SCAN_PATHS) {
    try {
      const fullPath = path.join(process.cwd(), scanPath);
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);
      
      if (!exists) continue;
      
      const files = await fs.readdir(fullPath, { recursive: true });
      
      for (const file of files) {
        const filePath = path.join(fullPath, file);
        const stat = await fs.stat(filePath).catch(() => null);
        
        if (stat?.isFile()) {
          const ext = path.extname(file).toLowerCase();
          if (CONFIG.supportedFormats.includes(ext)) {
            images.push({
              originalPath: filePath,
              name: path.basename(file, ext),
              extension: ext,
              directory: path.dirname(filePath),
              size: stat.size
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${scanPath}:`, error.message);
    }
  }
  
  return images;
}

/**
 * Ensure output directory exists
 */
async function ensureOutputDir() {
  const outputPath = path.join(process.cwd(), CONFIG.outputDir);
  await fs.mkdir(outputPath, { recursive: true });
  return outputPath;
}

/**
 * Generate blur placeholder
 */
async function generatePlaceholder(imagePath, outputPath) {
  try {
    const placeholderPath = path.join(outputPath, 'placeholder.webp');
    
    await sharp(imagePath)
      .resize(20, 20)
      .blur(2)
      .webp({ quality: 20 })
      .toFile(placeholderPath);
      
    return placeholderPath;
  } catch (error) {
    console.warn('Failed to generate placeholder:', error.message);
    return null;
  }
}

/**
 * Convert single image to WebP with responsive variants
 */
async function convertImage(imageInfo, outputDir) {
  const { originalPath, name, size } = imageInfo;
  const results = [];
  
  try {
    console.log(`Converting: ${originalPath} (${(size / 1024).toFixed(1)}KB)`);
    
    // Create subdirectory for this image
    const imageOutputDir = path.join(outputDir, name);
    await fs.mkdir(imageOutputDir, { recursive: true });
    
    // Original size WebP
    const originalWebP = path.join(imageOutputDir, `${name}.webp`);
    await sharp(originalPath)
      .webp({ 
        quality: CONFIG.quality,
        effort: CONFIG.effort 
      })
      .toFile(originalWebP);
    
    const originalStat = await fs.stat(originalWebP);
    results.push({
      variant: 'original',
      path: originalWebP,
      size: originalStat.size,
      savings: ((size - originalStat.size) / size * 100).toFixed(1)
    });
    
    // Generate responsive variants if enabled
    if (CONFIG.generateResponsive) {
      const metadata = await sharp(originalPath).metadata();
      
      for (const width of CONFIG.responsiveWidths) {
        if (width < (metadata.width || 0)) {
          const responsiveWebP = path.join(imageOutputDir, `${name}-${width}w.webp`);
          
          await sharp(originalPath)
            .resize(width, null, { withoutEnlargement: true })
            .webp({ 
              quality: CONFIG.quality,
              effort: CONFIG.effort 
            })
            .toFile(responsiveWebP);
          
          const responsiveStat = await fs.stat(responsiveWebP);
          results.push({
            variant: `${width}w`,
            path: responsiveWebP,
            size: responsiveStat.size,
            savings: ((size - responsiveStat.size) / size * 100).toFixed(1)
          });
        }
      }
    }
    
    // Generate placeholder if enabled
    if (CONFIG.generatePlaceholder) {
      const placeholderPath = await generatePlaceholder(originalPath, imageOutputDir);
      if (placeholderPath) {
        const placeholderStat = await fs.stat(placeholderPath);
        results.push({
          variant: 'placeholder',
          path: placeholderPath,
          size: placeholderStat.size,
          savings: ((size - placeholderStat.size) / size * 100).toFixed(1)
        });
      }
    }
    
    console.log(`✅ Converted ${name}: ${results.length} variants created`);
    return { success: true, image: name, variants: results };
    
  } catch (error) {
    console.error(`❌ Failed to convert ${name}:`, error.message);
    return { success: false, image: name, error: error.message };
  }
}

/**
 * Generate manifest file with image mappings
 */
async function generateManifest(conversionResults, outputDir) {
  const manifest = {
    generated: new Date().toISOString(),
    totalImages: conversionResults.length,
    successfulConversions: conversionResults.filter(r => r.success).length,
    images: {}
  };
  
  for (const result of conversionResults) {
    if (result.success) {
      manifest.images[result.image] = result.variants.map(v => ({
        variant: v.variant,
        path: path.relative(process.cwd(), v.path),
        size: v.size,
        savings: v.savings
      }));
    }
  }
  
  const manifestPath = path.join(outputDir, 'image-manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`📋 Generated manifest: ${manifestPath}`);
  return manifest;
}

/**
 * Generate TypeScript definitions for optimized images
 */
async function generateImageTypes(manifest, outputDir) {
  const typeDefs = `/**
 * Auto-generated image type definitions
 * Generated on: ${manifest.generated}
 */

export interface OptimizedImageVariant {
  variant: string;
  path: string;
  size: number;
  savings: string;
}

export interface OptimizedImageSet {
  [variant: string]: OptimizedImageVariant[];
}

export const OPTIMIZED_IMAGES: OptimizedImageSet = ${JSON.stringify(manifest.images, null, 2)};

// Helper function to get image variants
export function getImageVariants(imageName: string): OptimizedImageVariant[] {
  return OPTIMIZED_IMAGES[imageName] || [];
}

// Helper function to get specific variant
export function getImageVariant(imageName: string, variant: string): OptimizedImageVariant | null {
  const variants = getImageVariants(imageName);
  return variants.find(v => v.variant === variant) || null;
}

// Helper function to get responsive src set
export function getResponsiveSrcSet(imageName: string): string {
  const variants = getImageVariants(imageName)
    .filter(v => v.variant.includes('w'))
    .sort((a, b) => {
      const aWidth = parseInt(a.variant.replace('w', ''));
      const bWidth = parseInt(b.variant.replace('w', ''));
      return aWidth - bWidth;
    });
  
  return variants.map(v => {
    const width = v.variant.replace('w', '');
    return \`\${v.path} \${width}w\`;
  }).join(', ');
}
`;

  const typesPath = path.join(outputDir, 'optimized-images.ts');
  await fs.writeFile(typesPath, typeDefs);
  
  console.log(`📝 Generated TypeScript definitions: ${typesPath}`);
}

/**
 * Generate usage examples
 */
async function generateUsageExamples(outputDir) {
  const examples = `/**
 * Usage Examples for Optimized Images
 */

import React from 'react';
import { OptimizedImage } from '../components/ui/optimized-image';
import { getImageVariants, getResponsiveSrcSet } from './optimized-images';

// Example 1: Using OptimizedImage component
export function ExampleImageUsage() {
  return (
    <OptimizedImage
      src="/assets/images/hero/hero.webp"
      alt="Hero image"
      width={1200}
      height={600}
      priority="above-fold"
      placeholder="blur"
      blurDataURL="/assets/images/hero/placeholder.webp"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
    />
  );
}

// Example 2: Manual responsive images
export function ResponsiveImageExample() {
  const srcSet = getResponsiveSrcSet('hero');
  
  return (
    <picture>
      <source
        srcSet={srcSet}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        type="image/webp"
      />
      <img
        src="/assets/images/hero/hero.webp"
        alt="Fallback image"
        loading="lazy"
      />
    </picture>
  );
}

// Example 3: Company logo with optimization
export function OptimizedCompanyLogo({ symbol }: { symbol: string }) {
  return (
    <OptimizedImage
      src={\`/api/image-proxy?url=\${encodeURIComponent(\`https://logo.clearbit.com/\${symbol}.com\`)}&format=webp&quality=85\`}
      alt={\`\${symbol} logo\`}
      width={32}
      height={32}
      priority="below-fold"
      fallback="/assets/images/placeholder-logo.webp"
    />
  );
}

// Example 4: Progressive loading with multiple sources
export function ProgressiveImageExample() {
  const sources = [
    '/assets/images/hero/hero.webp',
    '/assets/images/hero/hero-640w.webp',
    '/assets/images/hero/placeholder.webp'
  ];
  
  return (
    <OptimizedImage
      src={sources[0]}
      alt="Progressive loading example"
      priority="critical"
      placeholder="blur"
    />
  );
}
`;

  const examplesPath = path.join(outputDir, 'usage-examples.tsx');
  await fs.writeFile(examplesPath, examples);
  
  console.log(`📚 Generated usage examples: ${examplesPath}`);
}

/**
 * Main conversion function
 */
async function main() {
  console.log('🚀 Starting image conversion to WebP...\n');
  
  try {
    // Find all images
    console.log('🔍 Scanning for images...');
    const images = await findImages();
    console.log(`Found ${images.length} images to convert\n`);
    
    if (images.length === 0) {
      console.log('No images found to convert.');
      return;
    }
    
    // Ensure output directory
    const outputDir = await ensureOutputDir();
    console.log(`📁 Output directory: ${outputDir}\n`);
    
    // Convert images
    console.log('🔄 Converting images...');
    const conversionResults = [];
    
    for (const image of images) {
      const result = await convertImage(image, outputDir);
      conversionResults.push(result);
    }
    
    // Generate manifest and types
    console.log('\n📋 Generating manifest and type definitions...');
    const manifest = await generateManifest(conversionResults, outputDir);
    await generateImageTypes(manifest, outputDir);
    await generateUsageExamples(outputDir);
    
    // Summary
    const successful = conversionResults.filter(r => r.success).length;
    const failed = conversionResults.length - successful;
    const totalVariants = conversionResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.variants.length, 0);
    
    console.log('\n✨ Conversion Summary:');
    console.log(`  ✅ Successfully converted: ${successful} images`);
    console.log(`  ❌ Failed conversions: ${failed} images`);
    console.log(`  📱 Total variants generated: ${totalVariants}`);
    console.log(`  📁 Output directory: ${CONFIG.outputDir}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed conversions:');
      conversionResults
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.image}: ${r.error}`));
    }
    
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, CONFIG };