import React from 'react';
import { HealthDashboard } from '../components/monitoring/health-dashboard';
import { Activity } from 'lucide-react';

export default function HealthMonitorPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-8 w-8 text-green-400" />
          <h1 className="text-3xl font-bold">System Health Monitor</h1>
        </div>
        <p className="text-gray-400">
          Real-time monitoring of system components and performance metrics
        </p>
      </div>
      
      <HealthDashboard />
    </div>
  );
}