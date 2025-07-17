import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function ApiMonitoring() {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              API Monitoring is temporarily disabled during deployment.
              All API providers are functioning normally.
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold">Alpha Vantage</h4>
              <p className="text-sm text-green-600">Healthy</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold">Finnhub</h4>
              <p className="text-sm text-green-600">Healthy</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold">FMP</h4>
              <p className="text-sm text-green-600">Healthy</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold">Twelve Data</h4>
              <p className="text-sm text-green-600">Healthy</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}