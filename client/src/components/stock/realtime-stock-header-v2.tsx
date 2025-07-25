import React from 'react';
import { StockHeaderV2 } from './stock-header-v2';
import type { RealtimeQuote } from '@/hooks/use-realtime-quotes';

interface RealtimeStockHeaderV2Props {
  symbol: string;
  company: {
    name: string;
    sector: string;
    price: number;
    change: number;
    changePercent: number;
    afterHoursPrice: number;
    afterHoursChange: number;
    afterHoursChangePercent: number;
    earningsDate: string;
    logo: string;
  };
  isInWatchlist: boolean;
  onAddToWatchlist: () => void;
  onShare?: () => void;
  realtimeQuote?: RealtimeQuote | null;
  isConnected?: boolean;
}

export function RealtimeStockHeaderV2({ 
  symbol, 
  company, 
  isInWatchlist, 
  onAddToWatchlist, 
  onShare,
  realtimeQuote,
  isConnected
}: RealtimeStockHeaderV2Props) {
  // Merge realtime data with company data
  const mergedCompany = realtimeQuote ? {
    ...company,
    price: realtimeQuote.price,
    change: realtimeQuote.change,
    changePercent: realtimeQuote.change_percent,
    // Keep after hours data from original as realtime doesn't provide it
    afterHoursPrice: company.afterHoursPrice,
    afterHoursChange: company.afterHoursChange,
    afterHoursChangePercent: company.afterHoursChangePercent
  } : company;

  return (
    <div className="relative">
      {/* Realtime indicator */}
      {isConnected && realtimeQuote && (
        <div className="absolute -top-2 -right-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" 
                title="Dados em tempo real" />
        </div>
      )}
      
      <StockHeaderV2
        symbol={symbol}
        company={mergedCompany}
        isInWatchlist={isInWatchlist}
        onAddToWatchlist={onAddToWatchlist}
        onShare={onShare}
      />
    </div>
  );
}