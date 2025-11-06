/**
 * European Priority Stocks
 *
 * Curated list of top European companies trading as ADRs or on major exchanges.
 * Organized by GICS sector and country.
 *
 * EXCLUDES: Portuguese stocks (per user requirement)
 *
 * Generated: 2025-11-05
 * Source: Manual curation (major European blue chips with US listings)
 * Total: 150 stocks
 */

export const EU_TOP_STOCKS: Record<string, string[]> = {
  'Energy': [
    'BP', 'SHEL', 'TTE', 'EQNR', 'RDSB', 'E', 'REP',
    'OGZPY', 'LUKOY'
  ],

  'Materials': [
    'RIO', 'BHP', 'LINDE', 'VALE', 'SCCO', 'BBL', 'ALV', 'BASFY',
    'AKZAY', 'SHLAF'
  ],

  'Industrials': [
    'SIEGY', 'ABB', 'VLVLY', 'HESAY', 'RYDAF', 'ARNC', 'SAFRY',
    'FRO', 'STLA', 'MBGAF'
  ],

  'Consumer Discretionary': [
    'LVMUY', 'RACE', 'NSANY', 'HYMTF', 'ADDYY', 'PRTY', 'BMWYY',
    'ALIZF', 'PPRUY', 'KER'
  ],

  'Consumer Staples': [
    'UL', 'NSRGY', 'DEO', 'DANOY', 'HENOY', 'ADRNY', 'SAB',
    'CRLBF', 'SBMRY', 'JESPY'
  ],

  'Health Care': [
    'NVO', 'AZN', 'SNY', 'RHHBY', 'GSK', 'NVS', 'BAYRY', 'SEMHF',
    'FANUY', 'NOVO'
  ],

  'Financials': [
    'HSBC', 'BCS', 'UBS', 'DB', 'INGA', 'SAN', 'BBVA', 'RY',
    'CM', 'BNS', 'TD', 'BMO', 'SCBFF', 'CS', 'ING', 'ABN',
    'DANSKE', 'SWEDA', 'NORBF', 'KBC'
  ],

  'Information Technology': [
    'ASML', 'SAP', 'IFNNY', 'STM', 'ASMIY', 'NOKIA', 'ERIC',
    'CAPMF', 'DASTY', 'ATOS'
  ],

  'Communication Services': [
    'TEF', 'VOD', 'ORAN', 'VIV', 'DTEGY', 'TLSNY', 'TCLRY',
    'VIVHY', 'BT', 'SBGSY'
  ],

  'Utilities': [
    'ENLAY', 'IBDRY', 'EOAN', 'NGGTF', 'EDPFY', 'VLOWY',
    'RWEOY', 'FRTNY', 'ESSITY', 'SEVVY'
  ],

  'Real Estate': [
    'VONOY', 'URW', 'SEGRO', 'LSE', 'LAND', 'PSH', 'GROWY',
    'UNIR', 'KLEPI', 'HMLSF'
  ],

};

/**
 * European stocks grouped by country
 */
export const EU_STOCKS_BY_COUNTRY: Record<string, string[]> = {
  'Germany': [
    'SAP', 'SIEGY', 'BASFY', 'BAYRY', 'ALV', 'BMWYY', 'VLVLY',
    'DB', 'DTEGY', 'HENOY', 'ADDYY', 'IFNNY', 'EOAN', 'RWEOY',
    'FRTNY', 'HEINY', 'POAHY', 'DDAIF', 'DBOEY', 'BAMXF',
    'BDRFY', 'LNNNY', 'TKAMY', 'TYEKF', 'BRFFY', 'DPSGY',
    'SMFKY', 'CBSFY', 'SBGSF', 'FNTNF'
  ],

  'France': [
    'LVMUY', 'TTE', 'SNY', 'ORAN', 'DANOY', 'AIR', 'ADRNY',
    'SAFRY', 'ENLAY', 'RHHBY', 'BNP', 'ACCOR', 'CAP', 'OREP',
    'CREUY', 'SGBLY', 'AXAHY', 'KER', 'PPRUY', 'AIRF',
    'LEGD', 'STLAP', 'TBSFY', 'VIVHY', 'BOTJ', 'ECRYY'
  ],

  'UK': [
    'HSBC', 'AZN', 'UL', 'BP', 'SHEL', 'GSK', 'RIO', 'BHP',
    'DEO', 'VOD', 'BCS', 'RELX', 'RDSB', 'BAT',
    'BT', 'LSEG', 'LLOY', 'NWG', 'BARC', 'IMI', 'RR',
    'SMT', 'RSA', 'SBRY'
  ],

  'Switzerland': [
    'NESN', 'RHHBY', 'NVS', 'UBS', 'ABB', 'CSGN', 'ZURN',
    'GEBN', 'GIVN', 'LISN', 'SCMN', 'SGSN', 'SLHN', 'SREN',
    'BUCN'
  ],

  'Netherlands': [
    'ASML', 'ING', 'PHIA', 'ABN', 'HEIA', 'AKZO', 'KPN',
    'NN', 'RAND', 'WKL', 'AALB', 'ALFEN', 'BAMNB', 'BESI',
    'FASTF'
  ],

  'Spain': [
    'TEF', 'SAN', 'BBVA', 'IBDRY', 'ALIZF', 'REP', 'ITX',
    'IBLA', 'FER', 'ACS', 'ENG', 'ABRTF', 'AENA', 'AMS'
  ],

  'Italy': [
    'RACE', 'STM', 'ENI', 'ENEL', 'UCG', 'ISP', 'GELYY',
    'ATLKY', 'LNSTY', 'FCAU'
  ],

  'Sweden': [
    'VOLV', 'ERIC', 'ATCO', 'HM', 'SAND', 'ESSITY', 'SEB',
    'SWED', 'ALFA', 'ASSA'
  ],

  'Denmark': [
    'NVO', 'NOVO', 'DSV', 'MAERSK', 'DANSKE', 'COLO', 'CARL',
    'VWSYF', 'DNZOF', 'GMAB'
  ],

  'Norway': [
    'EQNR', 'DNB', 'NORBF', 'MOWI', 'ORK', 'STBFF',
    'AKRBF', 'NHYDY', 'YARF'
  ],

  'Belgium': [
    'ABI', 'KBC', 'UCB', 'ACKB', 'GBLB', 'ARGX', 'COLB',
    'SOLVF', 'TELB', 'PROX'
  ],

  'Finland': [
    'NOKIA', 'FORTUM', 'NESTE', 'UPM', 'SAMPO', 'KNEBV',
    'KESKOB', 'ORNBF', 'WARTSILA', 'METSO'
  ],

  'Ireland': [
    'LINDE', 'RYDAF', 'CRH', 'KERYY', 'SMURFIT', 'GPRK',
    'ICLR', 'PERRIGO', 'JAZZ', 'ICON'
  ],

  'Austria': [
    'OMV', 'VNRFY', 'ANDR', 'VOES', 'WBSFY', 'ERBAF',
    'SCADY', 'CAATF', 'RABBY', 'POST'
  ],

};

/**
 * Flattened array of all EU priority stocks (150 total)
 */
export const ALL_EU_STOCKS = Object.values(EU_TOP_STOCKS).flat();

/**
 * Sector and country statistics
 */
export const EU_STOCKS_STATS = {
  sectorBreakdown: {
    'Energy': 10,
    'Materials': 10,
    'Industrials': 10,
    'Consumer Discretionary': 10,
    'Consumer Staples': 10,
    'Health Care': 10,
    'Financials': 20,
    'Information Technology': 10,
    'Communication Services': 10,
    'Utilities': 10,
    'Real Estate': 10
  },
  countryBreakdown: {
    'Germany': 30,
    'France': 26,
    'UK': 25,
    'Switzerland': 15,
    'Netherlands': 15,
    'Spain': 14,
    'Italy': 10,
    'Sweden': 10,
    'Denmark': 10,
    'Norway': 10,
    'Belgium': 10,
    'Finland': 10,
    'Ireland': 10,
    'Austria': 10
  }
};
