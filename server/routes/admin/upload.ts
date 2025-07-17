/**
 * Admin Upload Routes - Phase 3 Implementation
 * 
 * File upload functionality for transcript files
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth-middleware';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept text files and common document formats
    const allowedMimes = [
      'text/plain',
      'text/html',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only text, HTML, PDF, and Word documents are allowed.'));
    }
  }
});

// Apply admin authentication to all routes
router.use(authMiddleware.instance.authenticate());
router.use(authMiddleware.instance.requirePermissions(['admin:transcripts']));

/**
 * POST /api/admin/upload/transcript-file
 * Upload transcript file and extract text content
 */
router.post('/transcript-file', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        timestamp: new Date().toISOString()
      });
    }

    const file = req.file;
    let extractedText = '';

    // Extract text based on file type
    switch (file.mimetype) {
      case 'text/plain':
        extractedText = file.buffer.toString('utf-8');
        break;
      
      case 'text/html':
        // Simple HTML text extraction (remove tags)
        const htmlContent = file.buffer.toString('utf-8');
        extractedText = htmlContent
          .replace(/<script[^>]*>.*?<\/script>/gis, '')
          .replace(/<style[^>]*>.*?<\/style>/gis, '')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        break;
      
      default:
        // For PDF and Word documents, we would need additional libraries
        // For now, return an error suggesting text upload
        return res.status(400).json({
          success: false,
          error: 'PDF and Word document parsing not yet implemented. Please copy and paste the text content directly.',
          timestamp: new Date().toISOString()
        });
    }

    // Basic validation of extracted content
    if (!extractedText || extractedText.length < 100) {
      return res.status(400).json({
        success: false,
        error: 'Extracted text is too short. Please ensure the file contains a valid transcript.',
        timestamp: new Date().toISOString()
      });
    }

    // Generate basic metadata about the content
    const wordCount = extractedText.trim().split(/\s+/).length;
    const lines = extractedText.split('\n');
    
    // Try to detect speakers (lines containing colons)
    const speakers = [...new Set(
      lines
        .filter(line => line.includes(':') && !line.startsWith('http'))
        .map(line => line.split(':')[0].trim())
        .filter(speaker => speaker.length > 0 && speaker.length < 50 && !speaker.includes(' '))
    )].slice(0, 10);

    // Try to detect sections (lines in brackets or containing "presentation")
    const sections = lines
      .filter(line => 
        line.trim().startsWith('[') || 
        line.trim().toLowerCase().includes('presentation') ||
        line.trim().toLowerCase().includes('q&a') ||
        line.trim().toLowerCase().includes('question')
      )
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        extractedText,
        metadata: {
          wordCount,
          estimatedReadTime: Math.ceil(wordCount / 200), // 200 words per minute
          speakers,
          sections,
          hasContent: wordCount > 100
        }
      },
      message: 'File processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing uploaded file:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 10MB.',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process uploaded file',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/upload/transcript-url
 * Extract transcript content from URL (for MarketBeat, Seeking Alpha, etc.)
 */
router.post('/transcript-url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
        timestamp: new Date().toISOString()
      });
    }

    // For security, only allow specific domains
    const allowedDomains = [
      'marketbeat.com',
      'seekingalpha.com',
      'fool.com',
      'finance.yahoo.com',
      'sec.gov'
    ];

    const urlObj = new URL(url);
    const isAllowedDomain = allowedDomains.some(domain => 
      urlObj.hostname.includes(domain)
    );

    if (!isAllowedDomain) {
      return res.status(400).json({
        success: false,
        error: `URL domain not allowed. Supported domains: ${allowedDomains.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // For now, return a placeholder response
    // In a real implementation, we would fetch and parse the URL content
    res.json({
      success: false,
      error: 'URL extraction not yet implemented. Please copy and paste the transcript text directly.',
      message: 'This feature will be available in the next update.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing transcript URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process transcript URL',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;