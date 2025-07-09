/**
 * Image Proxy Service for Alfalyzer
 * Handles image optimization, WebP conversion, and caching
 */

import express from 'express';
import sharp from 'sharp';
import fetch from 'node-fetch';
import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Cache directory for optimized images
const CACHE_DIR = path.join(process.cwd(), 'cache', 'images');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.warn('Failed to create cache directory:', error);
  }
}

ensureCacheDir();

interface ImageOptimizationParams {
  url: string;
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  blur?: boolean;
}

/**
 * Generate cache key for image
 */
function generateCacheKey(params: ImageOptimizationParams): string {
  const hash = createHash('md5');
  hash.update(JSON.stringify(params));
  return hash.digest('hex');
}

/**
 * Get cached image path
 */
function getCachePath(cacheKey: string, format: string): string {
  return path.join(CACHE_DIR, `${cacheKey}.${format}`);
}

/**
 * Check if cached image exists and is valid
 */
async function getCachedImage(cacheKey: string, format: string): Promise<Buffer | null> {
  try {
    const cachePath = getCachePath(cacheKey, format);
    const stats = await fs.stat(cachePath);
    
    // Check if cache is expired
    if (Date.now() - stats.mtime.getTime() > CACHE_TTL) {
      await fs.unlink(cachePath);
      return null;
    }
    
    return await fs.readFile(cachePath);
  } catch {
    return null;
  }
}

/**
 * Save image to cache
 */
async function saveToCache(cacheKey: string, format: string, buffer: Buffer): Promise<void> {
  try {
    const cachePath = getCachePath(cacheKey, format);
    await fs.writeFile(cachePath, buffer);
  } catch (error) {
    console.warn('Failed to save image to cache:', error);
  }
}

/**
 * Fetch and optimize image
 */
async function optimizeImage(params: ImageOptimizationParams): Promise<Buffer> {
  const { url, quality, format, width, height, blur } = params;
  
  // Fetch original image
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Alfalyzer/1.0 (Image Optimizer)',
    },
    timeout: 10000
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  
  const imageBuffer = await response.buffer();
  
  // Initialize Sharp
  let sharpInstance = sharp(imageBuffer);
  
  // Resize if dimensions provided
  if (width || height) {
    sharpInstance = sharpInstance.resize(width, height, {
      fit: 'cover',
      withoutEnlargement: true
    });
  }
  
  // Apply blur effect if requested
  if (blur) {
    sharpInstance = sharpInstance.blur(2);
  }
  
  // Convert to target format with optimization
  switch (format) {
    case 'webp':
      sharpInstance = sharpInstance.webp({ 
        quality,
        effort: 6, // Maximum compression effort
        lossless: false
      });
      break;
    case 'jpeg':
      sharpInstance = sharpInstance.jpeg({ 
        quality,
        progressive: true,
        mozjpeg: true
      });
      break;
    case 'png':
      sharpInstance = sharpInstance.png({ 
        quality,
        compressionLevel: 9,
        progressive: true
      });
      break;
  }
  
  return await sharpInstance.toBuffer();
}

/**
 * Image proxy endpoint
 */
router.get('/proxy', async (req, res) => {
  try {
    const {
      url,
      quality = '85',
      format = 'webp',
      width,
      height,
      blur = 'false'
    } = req.query as Record<string, string>;
    
    // Validate parameters
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const decodedUrl = decodeURIComponent(url);
    
    // Validate URL
    try {
      new URL(decodedUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    
    // Security: Only allow certain domains
    const allowedDomains = [
      'logo.clearbit.com',
      'finnhub.io',
      'logo.yahoo.com',
      'via.placeholder.com',
      'images.unsplash.com',
      'source.unsplash.com'
    ];
    
    const urlDomain = new URL(decodedUrl).hostname;
    if (!allowedDomains.some(domain => urlDomain.includes(domain))) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }
    
    const params: ImageOptimizationParams = {
      url: decodedUrl,
      quality: Math.min(100, Math.max(1, parseInt(quality))),
      format: ['webp', 'jpeg', 'png'].includes(format) ? format as any : 'webp',
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      blur: blur === 'true'
    };
    
    const cacheKey = generateCacheKey(params);
    
    // Try to serve from cache
    const cachedImage = await getCachedImage(cacheKey, params.format);
    if (cachedImage) {
      res.set({
        'Content-Type': `image/${params.format}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'HIT'
      });
      return res.send(cachedImage);
    }
    
    // Optimize image
    const optimizedImage = await optimizeImage(params);
    
    // Save to cache
    await saveToCache(cacheKey, params.format, optimizedImage);
    
    // Send response
    res.set({
      'Content-Type': `image/${params.format}`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Cache': 'MISS'
    });
    
    res.send(optimizedImage);
    
  } catch (error) {
    console.error('Image optimization error:', error);
    
    // Try to serve a fallback image
    try {
      const fallbackSvg = `
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" fill="#f3f4f6"/>
          <text x="32" y="36" font-family="Arial" font-size="12" text-anchor="middle" fill="#6b7280">?</text>
        </svg>
      `;
      
      res.set({
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache'
      });
      
      res.send(fallbackSvg);
    } catch {
      res.status(500).json({ error: 'Image optimization failed' });
    }
  }
});

/**
 * Batch optimization endpoint
 */
router.post('/batch', async (req, res) => {
  try {
    const { images } = req.body as { images: Array<{ url: string; options?: Partial<ImageOptimizationParams> }> };
    
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Images array is required' });
    }
    
    if (images.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 images per batch' });
    }
    
    const results = await Promise.allSettled(
      images.map(async ({ url, options = {} }) => {
        const params: ImageOptimizationParams = {
          url,
          quality: 85,
          format: 'webp',
          ...options
        };
        
        const cacheKey = generateCacheKey(params);
        const cachedImage = await getCachedImage(cacheKey, params.format);
        
        if (cachedImage) {
          return {
            url,
            optimized: true,
            cached: true,
            size: cachedImage.length
          };
        }
        
        const optimizedImage = await optimizeImage(params);
        await saveToCache(cacheKey, params.format, optimizedImage);
        
        return {
          url,
          optimized: true,
          cached: false,
          size: optimizedImage.length
        };
      })
    );
    
    const response = results.map((result, index) => ({
      url: images[index].url,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
    
    res.json({ results: response });
    
  } catch (error) {
    console.error('Batch optimization error:', error);
    res.status(500).json({ error: 'Batch optimization failed' });
  }
});

/**
 * Cache management endpoints
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const files = await fs.readdir(CACHE_DIR);
    const stats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(CACHE_DIR, file);
        const stat = await fs.stat(filePath);
        return {
          file,
          size: stat.size,
          created: stat.birthtime,
          modified: stat.mtime
        };
      })
    );
    
    const totalSize = stats.reduce((sum, stat) => sum + stat.size, 0);
    
    res.json({
      fileCount: files.length,
      totalSize,
      files: stats.sort((a, b) => b.modified.getTime() - a.modified.getTime())
    });
    
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

router.delete('/cache/clear', async (req, res) => {
  try {
    const files = await fs.readdir(CACHE_DIR);
    await Promise.all(
      files.map(file => fs.unlink(path.join(CACHE_DIR, file)))
    );
    
    res.json({ message: `Cleared ${files.length} cached images` });
    
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export { router as imageProxyRouter };