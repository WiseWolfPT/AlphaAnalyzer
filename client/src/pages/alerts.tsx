/**
 * ALERTS PAGE
 * Complete alert management interface for Alfalyzer
 * AGENTE 8: Complete notification system implementation
 */

import React from 'react';
import AlertManager from '@/components/alerts/alert-manager';
import { MainLayout } from '@/components/layout/main-layout';

const AlertsPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <AlertManager />
      </div>
    </MainLayout>
  );
};

export default AlertsPage;