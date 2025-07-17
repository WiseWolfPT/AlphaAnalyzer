import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface BackfillJob {
  id: string;
  symbol: string;
  startDate: string;
  endDate: string;
  priority: number;
  dataTypes: string[];
  provider: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  dataPointsCollected: number;
  errorsEncountered: number;
}

interface BackfillStats {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  pausedJobs: number;
  totalDataPoints: number;
  avgJobDurationMs: number;
  jobsCompletedToday: number;
  mostActiveProvider: string;
  highestPrioritySymbol: string;
}

interface BackfillProgress {
  symbol: string;
  totalDays: number;
  completedDays: number;
  progressPercent: number;
  currentDate: string;
  estimatedTimeRemaining: string;
  dataPointsCollected: number;
  errorsEncountered: number;
}

export default function BackfillDashboard() {
  const [jobs, setJobs] = useState<BackfillJob[]>([]);
  const [stats, setStats] = useState<BackfillStats | null>(null);
  const [currentProgress, setCurrentProgress] = useState<BackfillProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New job form state
  const [newJobForm, setNewJobForm] = useState({
    symbol: '',
    startDate: '',
    endDate: '',
    priority: 5,
    dataTypes: ['aggregates'],
    provider: 'polygon'
  });

  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch data
  const fetchData = async () => {
    try {
      const [jobsRes, statsRes, progressRes] = await Promise.all([
        fetch('/api/admin/backfill/jobs'),
        fetch('/api/admin/backfill/stats'),
        fetch('/api/admin/backfill/progress')
      ]);

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setCurrentProgress(progressData);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch backfill data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 10 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchData, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Create new backfill job
  const createJob = async () => {
    if (!newJobForm.symbol || !newJobForm.startDate || !newJobForm.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreatingJob(true);
    try {
      const response = await fetch('/api/admin/backfill/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJobForm)
      });

      if (response.ok) {
        const newJob = await response.json();
        setJobs(prev => [...prev, newJob]);
        setNewJobForm({
          symbol: '',
          startDate: '',
          endDate: '',
          priority: 5,
          dataTypes: ['aggregates'],
          provider: 'polygon'
        });
        await fetchData(); // Refresh stats
      } else {
        const errorData = await response.json();
        alert(`Failed to create job: ${errorData.error}`);
      }
    } catch (err) {
      alert(`Failed to create job: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCreatingJob(false);
    }
  };

  // Job actions
  const pauseJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/backfill/jobs/${jobId}/pause`, { method: 'POST' });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to pause job:', err);
    }
  };

  const resumeJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/backfill/jobs/${jobId}/resume`, { method: 'POST' });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to resume job:', err);
    }
  };

  const cancelJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) return;
    
    try {
      const response = await fetch(`/api/admin/backfill/jobs/${jobId}/cancel`, { method: 'POST' });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to cancel job:', err);
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/backfill/jobs/${jobId}/retry`, { method: 'POST' });
      if (response.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to retry job:', err);
    }
  };

  // Utility functions
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number): string => {
    if (priority >= 9) return 'bg-red-100 text-red-800';
    if (priority >= 7) return 'bg-orange-100 text-orange-800';
    if (priority >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatDuration = (ms: number): string => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
    return `${Math.round(ms / 86400000)}d`;
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading backfill dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Historical Data Backfill</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <Button onClick={fetchData} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{stats.totalJobs}</div>
            <div className="text-sm text-gray-600">Total Jobs</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingJobs}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{stats.runningJobs}</div>
            <div className="text-sm text-gray-600">Running</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{stats.completedJobs}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-red-600">{stats.failedJobs}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{formatNumber(stats.totalDataPoints)}</div>
            <div className="text-sm text-gray-600">Data Points</div>
          </div>
        </div>
      )}

      {/* Current Progress */}
      {currentProgress && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Current Job Progress</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">{currentProgress.symbol}</span>
              <span className="text-sm text-gray-600">
                {currentProgress.completedDays} / {currentProgress.totalDays} days
              </span>
            </div>
            <Progress value={currentProgress.progressPercent} className="h-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Progress</div>
                <div className="font-medium">{currentProgress.progressPercent}%</div>
              </div>
              <div>
                <div className="text-gray-600">ETA</div>
                <div className="font-medium">{currentProgress.estimatedTimeRemaining}</div>
              </div>
              <div>
                <div className="text-gray-600">Data Points</div>
                <div className="font-medium">{formatNumber(currentProgress.dataPointsCollected)}</div>
              </div>
              <div>
                <div className="text-gray-600">Errors</div>
                <div className="font-medium">{currentProgress.errorsEncountered}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Job Queue</TabsTrigger>
          <TabsTrigger value="create">Create Job</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Job Queue Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Backfill Jobs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Range</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{job.symbol}</div>
                        <div className="text-xs text-gray-500">{job.dataTypes.join(', ')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{job.startDate}</div>
                        <div className="text-xs text-gray-500">to {job.endDate}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getPriorityColor(job.priority)}>
                          {job.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                        {job.error && (
                          <div className="text-xs text-red-600 mt-1" title={job.error}>
                            Error: {job.error.substring(0, 30)}...
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1">
                            <Progress value={job.progress} className="h-2" />
                          </div>
                          <span className="text-xs text-gray-600">{job.progress}%</span>
                        </div>
                        {job.dataPointsCollected > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatNumber(job.dataPointsCollected)} data points
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{job.provider}</Badge>
                        {job.retryCount > 0 && (
                          <div className="text-xs text-orange-600 mt-1">
                            Retries: {job.retryCount}/{job.maxRetries}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-1">
                          {job.status === 'running' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pauseJob(job.id)}
                            >
                              Pause
                            </Button>
                          )}
                          {job.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resumeJob(job.id)}
                            >
                              Resume
                            </Button>
                          )}
                          {(job.status === 'pending' || job.status === 'paused') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelJob(job.id)}
                            >
                              Cancel
                            </Button>
                          )}
                          {job.status === 'failed' && job.retryCount < job.maxRetries && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retryJob(job.id)}
                            >
                              Retry
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Create Job Tab */}
        <TabsContent value="create" className="space-y-4">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Create New Backfill Job</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Symbol</label>
                <Input
                  value={newJobForm.symbol}
                  onChange={(e) => setNewJobForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  placeholder="AAPL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Priority (1-10)</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={newJobForm.priority}
                  onChange={(e) => setNewJobForm(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <Input
                  type="date"
                  value={newJobForm.startDate}
                  onChange={(e) => setNewJobForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <Input
                  type="date"
                  value={newJobForm.endDate}
                  onChange={(e) => setNewJobForm(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Provider</label>
                <Select
                  value={newJobForm.provider}
                  onValueChange={(value) => setNewJobForm(prev => ({ ...prev, provider: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="polygon">Polygon.io</SelectItem>
                    <SelectItem value="twelve_data">Twelve Data</SelectItem>
                    <SelectItem value="fmp">FMP</SelectItem>
                    <SelectItem value="alpha_vantage">Alpha Vantage</SelectItem>
                    <SelectItem value="finnhub">Finnhub</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Data Types</label>
                <div className="space-y-2">
                  {['aggregates', 'quotes', 'fundamentals'].map((type) => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newJobForm.dataTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewJobForm(prev => ({
                              ...prev,
                              dataTypes: [...prev.dataTypes, type]
                            }));
                          } else {
                            setNewJobForm(prev => ({
                              ...prev,
                              dataTypes: prev.dataTypes.filter(t => t !== type)
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button 
                onClick={createJob} 
                disabled={isCreatingJob}
                className="w-full md:w-auto"
              >
                {isCreatingJob ? 'Creating...' : 'Create Backfill Job'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jobs Completed Today</span>
                    <span className="font-medium">{stats.jobsCompletedToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Job Duration</span>
                    <span className="font-medium">{formatDuration(stats.avgJobDurationMs || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Most Active Provider</span>
                    <span className="font-medium">{stats.mostActiveProvider || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next Priority Symbol</span>
                    <span className="font-medium">{stats.highestPrioritySymbol || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Job Status Distribution</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-sm">Completed</span>
                    </div>
                    <span className="text-sm font-medium">{stats.completedJobs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-sm">Running</span>
                    </div>
                    <span className="text-sm font-medium">{stats.runningJobs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className="text-sm">Pending</span>
                    </div>
                    <span className="text-sm font-medium">{stats.pendingJobs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-sm">Failed</span>
                    </div>
                    <span className="text-sm font-medium">{stats.failedJobs}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}