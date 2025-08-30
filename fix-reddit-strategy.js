// Patch to add synthetic price generation to reddit-strategy.js
// This file adds the generateSyntheticPrice method and updates getQuoteForUser

// Add this method to the RedditStrategy class
RedditStrategy.prototype.generateSyntheticPrice = function(symbol) {
  const basePrices = {
    'AAPL': 225,
    'MSFT': 425,
    'GOOGL': 175,
    'AMZN': 185,
    'META': 550,
    'TSLA': 250,
    'NVDA': 130,
    'JPM': 210,
    'V': 285,
    'JNJ': 155,
    'WMT': 90,
    'PG': 175,
    'MA': 500,
    'UNH': 550,
    'HD': 400,
    'BAC': 35,
    'WFC': 58,
    'BRK.B': 480,
    'PFE': 26,
    'DIS': 115,
    'NFLX': 720,
    'ADBE': 630,
    'CRM': 335,
    'ORCL': 155,
    'INTC': 45,
    'AMD': 180,
    'QCOM': 175,
    'TXN': 195,
    'IBM': 195,
    'GE': 165
  };
  
  let basePrice = basePrices[symbol];
  if (!basePrice) {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
      hash = hash & hash;
    }
    basePrice = Math.abs(hash) % 500 + 50;
  }
  
  const variation = (Math.random() - 0.5) * 0.04;
  return Math.round((basePrice * (1 + variation)) * 100) / 100;
};

// Export for use in patch
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateSyntheticPrice: RedditStrategy.prototype.generateSyntheticPrice };
}