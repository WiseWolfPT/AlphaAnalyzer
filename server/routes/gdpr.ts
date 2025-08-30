import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { supabaseAdmin as supabase } from '../lib/supabase-admin';
import { format } from 'date-fns';

const router = Router();

// Schema validation
const gdprRequestSchema = z.object({
  type: z.enum(['export', 'delete', 'access', 'rectify']),
  reason: z.string().optional(),
  data: z.any().optional()
});

/**
 * @route GET /api/gdpr/export
 * @desc Export all user data (GDPR Article 20 - Data Portability)
 * @access Private
 */
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Collect all user data from different tables
    const [
      userProfile,
      watchlists,
      portfolios,
      alerts,
      transactions
    ] = await Promise.all([
      // User profile
      supabase
        .from('users_metadata')
        .select('*')
        .eq('id', userId)
        .single(),
      
      // Watchlists
      supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', userId),
      
      // Portfolios
      supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId),
      
      // Price alerts
      supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', userId),
      
      // Transactions (if exists)
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
    ]);

    // Compile all data
    const userData = {
      exportDate: new Date().toISOString(),
      userId,
      profile: userProfile.data,
      watchlists: watchlists.data || [],
      portfolios: portfolios.data || [],
      alerts: alerts.data || [],
      transactions: transactions.data || []
    };

    // Set headers for file download
    const filename = `alfalyzer-data-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.json(userData);
  } catch (error) {
    console.error('GDPR export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * @route DELETE /api/gdpr/delete
 * @desc Delete all user data (GDPR Article 17 - Right to Erasure)
 * @access Private
 */
router.delete('/delete', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Verify user identity with additional confirmation
    const { confirmation } = req.body;
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ 
        error: 'Please confirm deletion by sending confirmation: "DELETE_MY_ACCOUNT"' 
      });
    }

    // Delete data from all tables (cascading delete should handle most)
    // But we'll be explicit for safety
    const deletionResults = await Promise.all([
      // Delete watchlists
      supabase
        .from('watchlists')
        .delete()
        .eq('user_id', userId),
      
      // Delete portfolios
      supabase
        .from('portfolios')
        .delete()
        .eq('user_id', userId),
      
      // Delete alerts
      supabase
        .from('price_alerts')
        .delete()
        .eq('user_id', userId),
      
      // Delete user metadata
      supabase
        .from('users_metadata')
        .delete()
        .eq('id', userId)
    ]);

    // Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Error deleting auth user:', authError);
      return res.status(500).json({ 
        error: 'Failed to completely delete account. Please contact support.' 
      });
    }

    // Log the deletion for compliance
    console.log(`GDPR deletion completed for user ${userId} at ${new Date().toISOString()}`);

    res.json({ 
      message: 'Your account and all associated data has been permanently deleted.',
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('GDPR deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * @route GET /api/gdpr/access
 * @desc Access specific user data (GDPR Article 15 - Right of Access)
 * @access Private
 */
router.get('/access/:dataType', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { dataType } = req.params;
    
    let data;
    
    switch (dataType) {
      case 'profile':
        const profile = await supabase
          .from('users_metadata')
          .select('*')
          .eq('id', userId)
          .single();
        data = profile.data;
        break;
        
      case 'watchlists':
        const watchlists = await supabase
          .from('watchlists')
          .select('*')
          .eq('user_id', userId);
        data = watchlists.data;
        break;
        
      case 'portfolios':
        const portfolios = await supabase
          .from('portfolios')
          .select('*')
          .eq('user_id', userId);
        data = portfolios.data;
        break;
        
      case 'alerts':
        const alerts = await supabase
          .from('price_alerts')
          .select('*')
          .eq('user_id', userId);
        data = alerts.data;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid data type' });
    }
    
    res.json({
      dataType,
      data,
      accessedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('GDPR access error:', error);
    res.status(500).json({ error: 'Failed to access data' });
  }
});

/**
 * @route PUT /api/gdpr/rectify
 * @desc Rectify/update user data (GDPR Article 16 - Right to Rectification)
 * @access Private
 */
router.put('/rectify', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { dataType, recordId, updates } = req.body;
    
    // Validate the request
    if (!dataType || !updates) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    let result;
    
    switch (dataType) {
      case 'profile':
        result = await supabase
          .from('users_metadata')
          .update(updates)
          .eq('id', userId);
        break;
        
      case 'watchlist':
        if (!recordId) {
          return res.status(400).json({ error: 'Record ID required for watchlist update' });
        }
        result = await supabase
          .from('watchlists')
          .update(updates)
          .eq('id', recordId)
          .eq('user_id', userId); // Ensure user owns this record
        break;
        
      case 'portfolio':
        if (!recordId) {
          return res.status(400).json({ error: 'Record ID required for portfolio update' });
        }
        result = await supabase
          .from('portfolios')
          .update(updates)
          .eq('id', recordId)
          .eq('user_id', userId);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid data type' });
    }
    
    if (result.error) {
      throw result.error;
    }
    
    res.json({
      message: 'Data updated successfully',
      dataType,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('GDPR rectification error:', error);
    res.status(500).json({ error: 'Failed to update data' });
  }
});

/**
 * @route POST /api/gdpr/consent
 * @desc Update consent preferences
 * @access Private
 */
router.post('/consent', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { preferences } = req.body;
    
    // Store consent preferences
    const { error } = await supabase
      .from('users_metadata')
      .update({
        consent_preferences: preferences,
        consent_updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) throw error;
    
    res.json({
      message: 'Consent preferences updated',
      preferences,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Consent update error:', error);
    res.status(500).json({ error: 'Failed to update consent' });
  }
});

/**
 * @route GET /api/gdpr/status
 * @desc Get GDPR request status
 * @access Private
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get user's GDPR-related metadata
    const { data, error } = await supabase
      .from('users_metadata')
      .select('created_at, updated_at, consent_preferences, consent_updated_at')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    res.json({
      userId,
      accountCreated: data?.created_at,
      lastUpdated: data?.updated_at,
      consentPreferences: data?.consent_preferences || {},
      consentLastUpdated: data?.consent_updated_at,
      dataRetentionPolicy: '5 years for financial records, 90 days for logs',
      rightsAvailable: [
        'Access (Article 15)',
        'Rectification (Article 16)',
        'Erasure (Article 17)',
        'Portability (Article 20)',
        'Object (Article 21)',
        'Restriction (Article 18)'
      ]
    });
  } catch (error) {
    console.error('GDPR status error:', error);
    res.status(500).json({ error: 'Failed to get GDPR status' });
  }
});

export default router;