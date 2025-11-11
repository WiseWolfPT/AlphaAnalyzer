/**
 * Manual Peer Fallbacks
 *
 * For stocks where the algorithm fails (mega-caps, unique market positions),
 * we provide manually curated peer lists.
 *
 * These are used as fallback when:
 * 1. Algorithm returns 0 peers
 * 2. Stock is in this dictionary
 */

export interface ManualPeerEntry {
  symbol: string;
  peers: string[];
  reason: string;
}

export const MANUAL_PEERS: Record<string, ManualPeerEntry> = {
  'TSLA': {
    symbol: 'TSLA',
    peers: ['GM', 'F', 'RIVN', 'LCID'],
    reason: 'Mega-cap ($800B) - automotive peers are <$100B (outside ±50% range)'
  },
  'WMT': {
    symbol: 'WMT',
    peers: ['TGT', 'COST', 'HD', 'LOW'],
    reason: 'Mega-cap ($680B) - most retail peers outside range'
  },
  'NFLX': {
    symbol: 'NFLX',
    peers: ['DIS', 'META', 'CMCSA', 'CHTR'],
    reason: 'Streaming leader ($380B) - unique market position, algorithm mismatch on FMP sector classification'
  },
  // Add more as needed
};

/**
 * Get manual peers for a symbol (if exists)
 */
export function getManualPeers(symbol: string): string[] | null {
  const entry = MANUAL_PEERS[symbol];
  return entry ? entry.peers : null;
}

/**
 * Check if symbol has manual peers defined
 */
export function hasManualPeers(symbol: string): boolean {
  return symbol in MANUAL_PEERS;
}
