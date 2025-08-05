/**
 * Market Hours Utilities
 * 
 * Helpers to determine market hours and adjust cache TTLs accordingly
 */

export interface MarketHours {
  isOpen: boolean;
  isPreMarket: boolean;
  isAfterHours: boolean;
  nextOpen?: Date;
  nextClose?: Date;
}

/**
 * Check if US markets are open
 * NYSE/NASDAQ: 9:30 AM - 4:00 PM EST
 * Pre-market: 4:00 AM - 9:30 AM EST
 * After-hours: 4:00 PM - 8:00 PM EST
 */
export function getMarketStatus(): MarketHours {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hours = nyTime.getHours();
  const minutes = nyTime.getMinutes();
  const day = nyTime.getDay();
  const time = hours * 100 + minutes;
  
  // Weekend - markets closed
  if (day === 0 || day === 6) {
    return {
      isOpen: false,
      isPreMarket: false,
      isAfterHours: false,
      nextOpen: getNextMarketOpen(nyTime)
    };
  }
  
  // Pre-market: 4:00 AM - 9:30 AM
  if (time >= 400 && time < 930) {
    return {
      isOpen: false,
      isPreMarket: true,
      isAfterHours: false,
      nextOpen: getNextMarketOpen(nyTime)
    };
  }
  
  // Regular market: 9:30 AM - 4:00 PM
  if (time >= 930 && time < 1600) {
    return {
      isOpen: true,
      isPreMarket: false,
      isAfterHours: false,
      nextClose: getNextMarketClose(nyTime)
    };
  }
  
  // After-hours: 4:00 PM - 8:00 PM
  if (time >= 1600 && time < 2000) {
    return {
      isOpen: false,
      isPreMarket: false,
      isAfterHours: true,
      nextOpen: getNextMarketOpen(nyTime)
    };
  }
  
  // Closed
  return {
    isOpen: false,
    isPreMarket: false,
    isAfterHours: false,
    nextOpen: getNextMarketOpen(nyTime)
  };
}

/**
 * Get dynamic cache TTLs based on market hours
 */
export function getDynamicCacheTTLs() {
  const marketStatus = getMarketStatus();
  
  if (marketStatus.isOpen) {
    // Market is open - use shorter TTLs for real-time data
    return {
      PRICE: 30 * 1000,              // 30 seconds
      FUNDAMENTALS: 6 * 60 * 60 * 1000, // 6 hours
      HISTORICAL: 7 * 24 * 60 * 60 * 1000, // 7 days
      COMPANY_INFO: 7 * 24 * 60 * 60 * 1000, // 7 days
      NEWS: 10 * 60 * 1000,          // 10 minutes
      AFTER_HOURS: 5 * 60 * 1000,    // 5 minutes
      SECTORS: 30 * 24 * 60 * 60 * 1000, // 30 days
    };
  } else if (marketStatus.isPreMarket || marketStatus.isAfterHours) {
    // Extended hours - moderate TTLs
    return {
      PRICE: 2 * 60 * 1000,          // 2 minutes
      FUNDAMENTALS: 6 * 60 * 60 * 1000, // 6 hours
      HISTORICAL: 7 * 24 * 60 * 60 * 1000, // 7 days
      COMPANY_INFO: 7 * 24 * 60 * 60 * 1000, // 7 days
      NEWS: 15 * 60 * 1000,          // 15 minutes
      AFTER_HOURS: 10 * 60 * 1000,   // 10 minutes
      SECTORS: 30 * 24 * 60 * 60 * 1000, // 30 days
    };
  } else {
    // Market closed - use longer TTLs
    return {
      PRICE: 5 * 60 * 1000,          // 5 minutes
      FUNDAMENTALS: 6 * 60 * 60 * 1000, // 6 hours
      HISTORICAL: 7 * 24 * 60 * 60 * 1000, // 7 days
      COMPANY_INFO: 7 * 24 * 60 * 60 * 1000, // 7 days
      NEWS: 30 * 60 * 1000,          // 30 minutes
      AFTER_HOURS: 30 * 60 * 1000,   // 30 minutes
      SECTORS: 30 * 24 * 60 * 60 * 1000, // 30 days
    };
  }
}

function getNextMarketOpen(nyTime: Date): Date {
  const next = new Date(nyTime);
  const day = next.getDay();
  const hours = next.getHours();
  
  // If it's before 9:30 AM on a weekday, market opens today
  if (day >= 1 && day <= 5 && hours < 9.5) {
    next.setHours(9, 30, 0, 0);
    return next;
  }
  
  // Otherwise, find next weekday
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0 || next.getDay() === 6);
  
  next.setHours(9, 30, 0, 0);
  return next;
}

function getNextMarketClose(nyTime: Date): Date {
  const next = new Date(nyTime);
  next.setHours(16, 0, 0, 0);
  return next;
}