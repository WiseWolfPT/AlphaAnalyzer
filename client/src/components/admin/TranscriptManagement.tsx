/**
 * Comprehensive Transcript Management Component
 * Handles listing, filtering, editing and publishing transcripts
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trackAdminAction } from '@/lib/logrocket';
import { 
  FileText, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Upload,
  Download
} from 'lucide-react';
import axios from 'axios';

interface Transcript {
  id: number;
  ticker: string;
  company_name: string;
  quarter: string;
  year: number;
  call_date?: string;
  raw_transcript?: string;
  ai_summary?: string;
  status: 'pending' | 'review' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  view_count?: number;
}

interface TranscriptStats {
  total: number;
  pending: number;
  published: number;
  archived: number;
}

export function TranscriptManagement() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [stats, setStats] = useState<TranscriptStats>({ total: 0, pending: 0, published: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTranscripts();
    fetchStats();
  }, [statusFilter]);

  const fetchTranscripts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await axios.get(`/api/admin/transcripts?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.data.success) {
        setTranscripts(response.data.data);
      } else {
        setError('Failed to fetch transcripts');
      }
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      setError('Failed to fetch transcripts');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/admin/transcripts/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching transcript stats:', error);
    }
  };

  const updateTranscriptStatus = async (id: number, status: string) => {
    try {
      const response = await axios.put(`/api/admin/transcripts/${id}`, 
        { status },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      if (response.data.success) {
        // Track admin action in LogRocket
        trackAdminAction('transcript_status_updated', 'transcript', {
          transcript_id: id,
          new_status: status,
          previous_status: transcripts.find(t => t.id === id)?.status,
        });

        fetchTranscripts();
        fetchStats();
      } else {
        setError('Failed to update transcript status');
      }
    } catch (error) {
      console.error('Error updating transcript:', error);
      setError('Failed to update transcript status');
    }
  };

  const deleteTranscript = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transcript?')) {
      return;
    }

    const transcript = transcripts.find(t => t.id === id);
    
    try {
      const response = await axios.delete(`/api/admin/transcripts/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.data.success) {
        // Track admin action in LogRocket
        trackAdminAction('transcript_deleted', 'transcript', {
          transcript_id: id,
          ticker: transcript?.ticker,
          company_name: transcript?.company_name,
          status: transcript?.status,
        });

        fetchTranscripts();
        fetchStats();
      } else {
        setError('Failed to delete transcript');
      }
    } catch (error) {
      console.error('Error deleting transcript:', error);
      setError('Failed to delete transcript');
    }
  };

  const publishTranscript = async (id: number) => {
    const transcript = transcripts.find(t => t.id === id);
    
    try {
      const response = await axios.post(`/api/admin/transcripts/${id}/publish`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.data.success) {
        // Track admin action in LogRocket
        trackAdminAction('transcript_published', 'transcript', {
          transcript_id: id,
          ticker: transcript?.ticker,
          company_name: transcript?.company_name,
          quarter: transcript?.quarter,
          year: transcript?.year,
        });

        fetchTranscripts();
        fetchStats();
      } else {
        setError('Failed to publish transcript');
      }
    } catch (error) {
      console.error('Error publishing transcript:', error);
      setError('Failed to publish transcript');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Published</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'review':
        return <Badge className="bg-blue-100 text-blue-800"><Eye className="w-3 h-3 mr-1" />Review</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-800"><AlertCircle className="w-3 h-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredTranscripts = transcripts.filter(transcript => {
    const matchesSearch = transcript.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transcript.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading transcripts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transcripts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Transcript Management</CardTitle>
          <CardDescription>
            View, edit, and manage earnings call transcripts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ticker or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="review">In Review</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchTranscripts} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Transcripts Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTranscripts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No transcripts found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTranscripts.map((transcript) => (
                    <TableRow key={transcript.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transcript.ticker}</div>
                          <div className="text-sm text-muted-foreground">{transcript.company_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {transcript.quarter} {transcript.year}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transcript.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(transcript.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {transcript.view_count || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTranscript(transcript);
                              setPreviewDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTranscript(transcript);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {transcript.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => publishTranscript(transcript.id)}
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteTranscript(transcript.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTranscript?.ticker} - {selectedTranscript?.quarter} {selectedTranscript?.year}
            </DialogTitle>
            <DialogDescription>
              Transcript preview and summary
            </DialogDescription>
          </DialogHeader>
          {selectedTranscript && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">AI Summary</h4>
                <div className="p-4 bg-gray-50 rounded-lg text-sm">
                  {selectedTranscript.ai_summary || 'No summary available'}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Full Transcript</h4>
                <div className="p-4 bg-gray-50 rounded-lg text-sm max-h-96 overflow-y-auto font-mono">
                  {selectedTranscript.raw_transcript || 'No transcript content available'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Transcript</DialogTitle>
            <DialogDescription>
              Update transcript information and status
            </DialogDescription>
          </DialogHeader>
          {selectedTranscript && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={selectedTranscript.status}
                    onValueChange={(value) => updateTranscriptStatus(selectedTranscript.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Company</Label>
                  <Input value={selectedTranscript.company_name} disabled />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}