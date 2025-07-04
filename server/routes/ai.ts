import { Router } from 'express';
import { anthropicService } from '../services/anthropic-service';

const router = Router();

router.post('/count-tokens', async (req, res) => {
  try {
    const { text, messages, model, system } = req.body;

    if (!text && !messages) {
      return res.status(400).json({
        error: 'Either text or messages must be provided',
      });
    }

    let tokenCount: number;

    if (text) {
      tokenCount = await anthropicService.countTextTokens(text, model);
    } else {
      tokenCount = await anthropicService.countMessagesTokens(messages, model, system);
    }

    res.json({
      tokens: tokenCount,
      model: model || 'claude-3-opus-20240229',
    });
  } catch (error) {
    console.error('Token counting error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Token counting failed',
    });
  }
});

router.post('/estimate-tokens', (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Text is required',
      });
    }

    const estimatedTokens = anthropicService.estimateTokens(text);

    res.json({
      tokens: estimatedTokens,
      isEstimate: true,
    });
  } catch (error) {
    console.error('Token estimation error:', error);
    res.status(500).json({
      error: 'Token estimation failed',
    });
  }
});

router.post('/generate-transcript-summary', async (req, res) => {
  try {
    const { transcript, ticker, quarter, year } = req.body;

    if (!transcript || !ticker || !quarter || !year) {
      return res.status(400).json({
        error: 'Missing required fields: transcript, ticker, quarter, year',
      });
    }

    const tokenCount = await anthropicService.countTextTokens(transcript);
    
    if (tokenCount > 150000) {
      return res.status(400).json({
        error: 'Transcript too long. Maximum 150,000 tokens allowed.',
        currentTokens: tokenCount,
      });
    }

    const summary = await anthropicService.generateTranscriptSummary(
      transcript,
      ticker,
      quarter,
      year
    );

    res.json({
      summary,
      inputTokens: tokenCount,
    });
  } catch (error) {
    console.error('Summary generation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Summary generation failed',
    });
  }
});

export default router;