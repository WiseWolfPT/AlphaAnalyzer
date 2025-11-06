#!/usr/bin/env node

/**
 * FASE 1 - Agent 1.2: Method Availability by Classification Validation
 *
 * Validates that each stock has the correct number of valuation methods
 * based on its classification (Bank, REIT, Growth, Value).
 *
 * Expected method counts:
 * - Banks: 9 methods (NO DCF methods allowed)
 * - REITs: 16-18 methods
 * - Growth: 14-15 methods (MUST have Growth DCF 8Y)
 * - Value: 13 methods
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = process.env.TARGET_URL || 'https://128.140.45.28.sslip.io';
const DELAY_MS = 300; // Rate limiting
const TIMEOUT_MS = 30000;

// Method counts by classification
const EXPECTED_COUNTS = {
  bank: { min: 9, max: 9, blocked: ['dcf-fcf-20', 'dcf-terminal-fcf', 'dni-20', 'dfcf-terminal'] },
  reit: { min: 16, max: 18 },
  growth: { min: 14, max: 15, required: ['growth-dcf-8y-ocf', 'growth-dcf-8y-fcf', 'growth-dcf-8y-ni'] },
  value: { min: 13, max: 13 }
};

// Full stock universe (1,493 stocks)
const STOCK_UNIVERSE = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'XOM',
  'JNJ', 'JPM', 'V', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV', 'PEP',
  'COST', 'AVGO', 'LLY', 'ADBE', 'KO', 'TMO', 'WMT', 'MCD', 'CSCO', 'ACN',
  'ABT', 'NKE', 'DHR', 'CRM', 'VZ', 'CMCSA', 'TXN', 'INTC', 'NEE', 'PM',
  'DIS', 'ORCL', 'UPS', 'BMY', 'AMD', 'QCOM', 'HON', 'UNP', 'RTX', 'BA',
  'LOW', 'COP', 'LIN', 'SBUX', 'IBM', 'SPGI', 'GS', 'INTU', 'CAT', 'AMGN',
  'DE', 'GILD', 'BLK', 'AXP', 'AMAT', 'MDLZ', 'ADP', 'ADI', 'BKNG', 'MMM',
  'SYK', 'TJX', 'CI', 'VRTX', 'PLD', 'ISRG', 'NOW', 'CVS', 'LRCX', 'ZTS',
  'C', 'MO', 'REGN', 'MS', 'SCHW', 'CB', 'MMC', 'SO', 'PGR', 'DUK',
  'BDX', 'TMUS', 'SLB', 'EOG', 'BSX', 'ITW', 'NOC', 'HUM', 'PNC', 'USB',
  'PYPL', 'AON', 'APD', 'GE', 'CL', 'F', 'EL', 'FIS', 'NSC', 'MU',
  'GM', 'TGT', 'SHW', 'D', 'WM', 'EMR', 'CME', 'FCX', 'PSA', 'GD',
  'MCO', 'ICE', 'DG', 'ECL', 'EQIX', 'APH', 'ETN', 'TT', 'AIG', 'HCA',
  'ROP', 'CSX', 'MCK', 'PH', 'KLAC', 'AFL', 'COF', 'ADM', 'SRE', 'EW',
  'CARR', 'TDG', 'WELL', 'SPG', 'ORLY', 'MSCI', 'SNPS', 'AZO', 'CCI', 'PCG',
  'KMB', 'AEP', 'CDNS', 'TEL', 'O', 'PAYX', 'TFC', 'MET', 'FTNT', 'PPG',
  'HLT', 'ROST', 'PRU', 'AJG', 'CTAS', 'YUM', 'ADSK', 'SYY', 'IDXX', 'ALL',
  'CMG', 'HSY', 'NXPI', 'AMT', 'KHC', 'EXC', 'CTSH', 'WMB', 'A', 'DLR',
  'DD', 'BK', 'KEYS', 'GIS', 'DHI', 'EA', 'KR', 'IQV', 'XEL', 'DOW',
  'FAST', 'RMD', 'VRSK', 'STZ', 'CPRT', 'OTIS', 'FDX', 'MCHP', 'ON', 'TROW',
  'GLW', 'IT', 'EXR', 'GEHC', 'LHX', 'AMP', 'BKR', 'MTD', 'ANSS', 'VICI',
  'WEC', 'ED', 'MPWR', 'ROK', 'PWR', 'AWK', 'AVB', 'EQR', 'VMC', 'CHTR',
  'BIIB', 'HAL', 'APTV', 'URI', 'WBA', 'CDW', 'STT', 'TTWO', 'PCAR', 'MLM',
  'CBRE', 'DAL', 'SBAC', 'HPQ', 'FTV', 'MAR', 'VTR', 'PPL', 'MNST', 'ES',
  'FITB', 'DXCM', 'LEN', 'ACGL', 'MTB', 'WY', 'DTE', 'WST', 'IFF', 'NEM',
  'HBAN', 'ETR', 'CAH', 'WAB', 'EBAY', 'LUV', 'ALGN', 'RF', 'CFG', 'K',
  'CNP', 'GPN', 'NUE', 'FE', 'TYL', 'CMS', 'CLX', 'TSCO', 'HOLX', 'AEE',
  'INVH', 'LVS', 'DRI', 'STE', 'TDY', 'PFG', 'LYB', 'TSN', 'NTRS', 'ARE',
  'WDC', 'TRGP', 'NI', 'MKC', 'J', 'EXPD', 'DFS', 'BALL', 'STLD', 'OMC',
  'NVR', 'VTRS', 'SWK', 'IP', 'CE', 'BBY', 'ULTA', 'MAS', 'MAA', 'CSGP',
  'HIG', 'IEX', 'EIX', 'BR', 'AMCR', 'LH', 'EXPE', 'ZBRA', 'PKI', 'CRL',
  'BAX', 'CINF', 'WAT', 'CAG', 'LNT', 'L', 'HES', 'HST', 'PODD', 'TER',
  'UDR', 'GWW', 'SYF', 'AVY', 'JBHT', 'CHD', 'POOL', 'CPT', 'KIM', 'CF',
  'TECH', 'AKAM', 'EVRG', 'UAL', 'NDAQ', 'AAL', 'JKHY', 'MOS', 'CPB', 'PEAK',
  'REG', 'PNR', 'WRB', 'AIZ', 'CHRW', 'BXP', 'GL', 'TPR', 'BF.B', 'ATO',
  'FRT', 'ALLE', 'LKQ', 'MKTX', 'RJF', 'ALB', 'EMN', 'PHM', 'FOXA', 'HSIC',
  'SNA', 'CTLT', 'CBOE', 'HRL', 'SEE', 'PNW', 'AAP', 'CCL', 'HII', 'MHK',
  'BEN', 'NWSA', 'ZION', 'AOS', 'IVZ', 'BIO', 'BWA', 'WHR', 'NWL', 'RL',
  // Adding Banks (should have 9 methods, NO DCF)
  'BAC', 'WFC', 'GS', 'MS', 'C', 'JPM', 'USB', 'PNC', 'TFC', 'SCHW',
  'BK', 'STT', 'NTRS', 'FITB', 'RF', 'CFG', 'HBAN', 'KEY', 'MTB', 'SIVB',
  'ZION', 'CMA', 'PBCT', 'FHN', 'SNV', 'ONB', 'EWBC', 'BOKF', 'OZK', 'UMBF',
  // Adding REITs (should have 16-18 methods)
  'PLD', 'AMT', 'EQIX', 'PSA', 'CCI', 'WELL', 'SPG', 'DLR', 'O', 'SBAC',
  'VICI', 'AVB', 'EQR', 'VTR', 'INVH', 'ARE', 'MAA', 'UDR', 'CPT', 'KIM',
  'REG', 'BXP', 'FRT', 'VNO', 'SLG', 'KRC', 'DEI', 'JBGS', 'HIW', 'BDN',
  'ELS', 'SUI', 'CUBE', 'LSI', 'NSA', 'PSB', 'REXR', 'TRNO', 'EGP', 'FR',
  // Adding Growth stocks (should have 14-15 methods with Growth DCF 8Y)
  'NVDA', 'TSLA', 'AMD', 'SHOP', 'SQ', 'ROKU', 'SNOW', 'DDOG', 'CRWD', 'NET',
  'ZM', 'OKTA', 'TWLO', 'PLTR', 'U', 'RBLX', 'COIN', 'RIVN', 'LCID', 'HOOD',
  'AFRM', 'UPST', 'SOFI', 'NU', 'MELI', 'SE', 'GRAB', 'DASH', 'ABNB', 'UBER',
  // Adding more diverse stocks for comprehensive testing
  'GOOGL', 'GOOG', 'META', 'AMZN', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS',
  'AAPL', 'MSFT', 'IBM', 'ORCL', 'CRM', 'ADBE', 'INTU', 'NOW', 'WDAY', 'TEAM',
  // Additional banks
  'AXP', 'DFS', 'COF', 'SYF', 'ALLY', 'LC', 'SOFI', 'UPST', 'AFRM',
  // Additional REITs
  'COLD', 'AMH', 'REXR', 'STAG', 'CTRE', 'GTY', 'PDM', 'ESRT', 'MPW', 'DOC',
  // Adding S&P 500 remainder to reach 1,493 stocks
  'ABMD', 'ACN', 'ADBE', 'ADI', 'ADM', 'ADP', 'ADSK', 'AEE', 'AEP', 'AES',
  'AFL', 'AIG', 'AIZ', 'AJG', 'AKAM', 'ALB', 'ALGN', 'ALL', 'ALLE', 'AMAT',
  'AMCR', 'AMD', 'AME', 'AMGN', 'AMP', 'AMT', 'AMZN', 'ANET', 'ANSS', 'AON',
  'AOS', 'APA', 'APD', 'APH', 'APTV', 'ARE', 'ATO', 'AVB', 'AVGO', 'AVY',
  'AWK', 'AXP', 'AZO', 'BA', 'BAC', 'BALL', 'BAX', 'BBWI', 'BBY', 'BDX',
  'BEN', 'BF.B', 'BIIB', 'BIO', 'BK', 'BKNG', 'BKR', 'BLK', 'BMY', 'BR',
  'BRO', 'BSX', 'BWA', 'BXP', 'C', 'CAG', 'CAH', 'CARR', 'CAT', 'CB',
  'CBOE', 'CBRE', 'CCI', 'CCL', 'CDAY', 'CDNS', 'CDW', 'CE', 'CEG', 'CF',
  'CFG', 'CHD', 'CHRW', 'CHTR', 'CI', 'CINF', 'CL', 'CLX', 'CMA', 'CMCSA',
  'CME', 'CMG', 'CMI', 'CMS', 'CNC', 'CNP', 'COF', 'COO', 'COP', 'COST',
  'CPAY', 'CPB', 'CPRT', 'CPT', 'CRL', 'CRM', 'CSCO', 'CSGP', 'CSX', 'CTAS',
  'CTLT', 'CTRA', 'CTSH', 'CTVA', 'CVS', 'CVX', 'CZR', 'D', 'DAL', 'DD',
  'DE', 'DELL', 'DFS', 'DG', 'DGX', 'DHI', 'DHR', 'DIS', 'DLR', 'DLTR',
  'DOV', 'DOW', 'DPZ', 'DRI', 'DTE', 'DUK', 'DVA', 'DVN', 'DXCM', 'EA',
  'EBAY', 'ECL', 'ED', 'EFX', 'EIX', 'EL', 'ELV', 'EMN', 'EMR', 'ENPH',
  'EOG', 'EPAM', 'EQIX', 'EQR', 'EQT', 'ES', 'ESS', 'ETN', 'ETR', 'ETSY',
  'EVRG', 'EW', 'EXC', 'EXPD', 'EXPE', 'EXR', 'F', 'FANG', 'FAST', 'FCX',
  'FDS', 'FDX', 'FE', 'FFIV', 'FI', 'FICO', 'FIS', 'FISV', 'FITB', 'FLT',
  'FMC', 'FOX', 'FOXA', 'FRC', 'FRT', 'FSLR', 'FTNT', 'FTV', 'GD', 'GE',
  'GEHC', 'GEN', 'GILD', 'GIS', 'GL', 'GLW', 'GM', 'GNRC', 'GOOG', 'GOOGL',
  'GPC', 'GPN', 'GRMN', 'GS', 'GWW', 'HAL', 'HAS', 'HBAN', 'HCA', 'HD',
  'HES', 'HIG', 'HII', 'HLT', 'HOLX', 'HON', 'HPE', 'HPQ', 'HRL', 'HSIC',
  'HST', 'HSY', 'HUBB', 'HUM', 'HWM', 'IBM', 'ICE', 'IDXX', 'IEX', 'IFF',
  'ILMN', 'INCY', 'INTC', 'INTU', 'INVH', 'IP', 'IPG', 'IQV', 'IR', 'IRM',
  'ISRG', 'IT', 'ITW', 'IVZ', 'J', 'JBHT', 'JBL', 'JCI', 'JKHY', 'JNJ',
  'JNPR', 'JPM', 'K', 'KDP', 'KEY', 'KEYS', 'KHC', 'KIM', 'KLAC', 'KMB',
  'KMI', 'KMX', 'KO', 'KR', 'KVUE', 'L', 'LDOS', 'LEN', 'LH', 'LHX',
  'LIN', 'LKQ', 'LLY', 'LMT', 'LNC', 'LNT', 'LOW', 'LRCX', 'LULU', 'LUV',
  'LVS', 'LW', 'LYB', 'LYV', 'MA', 'MAA', 'MAR', 'MAS', 'MCD', 'MCHP',
  'MCK', 'MCO', 'MDLZ', 'MDT', 'MET', 'META', 'MGM', 'MHK', 'MKC', 'MKTX',
  'MLM', 'MMC', 'MMM', 'MNST', 'MO', 'MOH', 'MOS', 'MPC', 'MPWR', 'MRK',
  'MRNA', 'MRO', 'MS', 'MSCI', 'MSFT', 'MSI', 'MTB', 'MTCH', 'MTD', 'MU',
  'NCLH', 'NDAQ', 'NDSN', 'NEE', 'NEM', 'NFLX', 'NI', 'NKE', 'NOC', 'NOW',
  'NRG', 'NSC', 'NTAP', 'NTRS', 'NUE', 'NVDA', 'NVR', 'NWS', 'NWSA', 'NXPI',
  'O', 'ODFL', 'OKE', 'OMC', 'ON', 'ORCL', 'ORLY', 'OTIS', 'OXY', 'PARA',
  'PAYC', 'PAYX', 'PCAR', 'PCG', 'PEAK', 'PEG', 'PEP', 'PFE', 'PFG', 'PG',
  'PGR', 'PH', 'PHM', 'PKG', 'PKI', 'PLD', 'PM', 'PNC', 'PNR', 'PNW',
  'PODD', 'POOL', 'PPG', 'PPL', 'PRU', 'PSA', 'PSX', 'PTC', 'PWR', 'PXD',
  'PYPL', 'QCOM', 'QRVO', 'RCL', 'RE', 'REG', 'REGN', 'RF', 'RHI', 'RJF',
  'RL', 'RMD', 'ROK', 'ROL', 'ROP', 'ROST', 'RSG', 'RTX', 'RVTY', 'SBAC',
  'SBUX', 'SCHW', 'SEDG', 'SEE', 'SHW', 'SIVB', 'SJM', 'SLB', 'SNA', 'SNPS',
  'SO', 'SPG', 'SPGI', 'SRE', 'STE', 'STLD', 'STT', 'STX', 'STZ', 'SWK',
  'SWKS', 'SYF', 'SYK', 'SYY', 'T', 'TAP', 'TDG', 'TDY', 'TECH', 'TEL',
  'TER', 'TFC', 'TFX', 'TGT', 'THC', 'TJX', 'TMO', 'TMUS', 'TPR', 'TRGP',
  'TRMB', 'TROW', 'TRV', 'TSCO', 'TSLA', 'TSN', 'TT', 'TTWO', 'TXN', 'TXT',
  'TYL', 'UAL', 'UDR', 'UHS', 'ULTA', 'UNH', 'UNP', 'UPS', 'URI', 'USB',
  'V', 'VFC', 'VICI', 'VLO', 'VMC', 'VRSK', 'VRSN', 'VRTX', 'VTR', 'VTRS',
  'VZ', 'WAB', 'WAT', 'WBA', 'WBD', 'WDC', 'WEC', 'WELL', 'WFC', 'WHR',
  'WM', 'WMB', 'WMT', 'WRB', 'WRK', 'WST', 'WTW', 'WY', 'WYNN', 'XEL',
  'XOM', 'XRAY', 'XYL', 'YUM', 'ZBH', 'ZBRA', 'ZION', 'ZTS',
  // Additional stocks to reach 1,493
  'ABBV', 'ABMD', 'ACHC', 'ACIW', 'ACLS', 'ACM', 'ADTN', 'AEL', 'AER', 'AGIO',
  'AGNC', 'AHH', 'AHT', 'AIN', 'AIRC', 'AIT', 'AKR', 'ALKS', 'ALNY', 'ALSN',
  'ALTM', 'ALTR', 'AM', 'AMED', 'AMG', 'AMKR', 'AMNB', 'AMP', 'AMPH', 'AMR',
  'AMRK', 'AMRN', 'AMRS', 'AMSF', 'AMSWA', 'AMTD', 'AMWD', 'AN', 'ANAT', 'ANCX',
  'ANDE', 'ANGI', 'ANIK', 'ANIP', 'ANIW', 'ANW', 'AOSL', 'APAM', 'APG', 'APLS',
  'APOG', 'APPF', 'APPN', 'APPS', 'APRE', 'APTS', 'APWC', 'AQB', 'AQMS', 'AQST',
  'AR', 'ARAY', 'ARC', 'ARCB', 'ARCC', 'ARCE', 'ARCH', 'ARCO', 'ARCT', 'ARDS',
  'ARDX', 'AREX', 'ARGO', 'ARGX', 'ARI', 'ARIS', 'ARKR', 'ARL', 'ARLP', 'ARMK',
  'ARMP', 'ARNC', 'AROC', 'AROW', 'ARR', 'ARRY', 'ARTNA', 'ARTW', 'ARVN', 'ARW',
  'ARWR', 'ASB', 'ASBI', 'ASC', 'ASGN', 'ASH', 'ASIX', 'ASML', 'ASND', 'ASPS',
  'ASPU', 'ASTE', 'ASUR', 'ASX', 'ATAX', 'ATCX', 'ATEC', 'ATEN', 'ATER', 'ATEX',
  'ATGE', 'ATH', 'ATHM', 'ATIF', 'ATIP', 'ATKR', 'ATLC', 'ATLO', 'ATMP', 'ATNI',
  'ATNM', 'ATOS', 'ATR', 'ATRA', 'ATRC', 'ATRI', 'ATRO', 'ATRS', 'ATSG', 'ATUS',
  'ATV', 'ATVI', 'ATXI', 'AUB', 'AUBN', 'AUDC', 'AUG', 'AUMN', 'AUPH', 'AUTL',
  'AUTO', 'AUVI', 'AUY', 'AVA', 'AVAV', 'AVD', 'AVDL', 'AVEO', 'AVGO', 'AVGR',
  'AVID', 'AVIR', 'AVK', 'AVNS', 'AVNT', 'AVNW', 'AVO', 'AVRO', 'AVT', 'AVTR',
  'AVXL', 'AVY', 'AVYA', 'AWH', 'AWI', 'AWK', 'AWR', 'AWRE', 'AX', 'AXDX',
  'AXGN', 'AXL', 'AXNX', 'AXON', 'AXP', 'AXR', 'AXS', 'AXSM', 'AXTA', 'AXTI',
  'AXU', 'AY', 'AYI', 'AYX', 'AZ', 'AZEK', 'AZN', 'AZO', 'AZPN', 'AZRE',
  'AZTA', 'AZZ', 'B', 'BA', 'BABA', 'BAC', 'BACK', 'BAH', 'BALY', 'BAM',
  'BANC', 'BAND', 'BANF', 'BANR', 'BANX', 'BAP', 'BARK', 'BASE', 'BASS', 'BAX',
  'BB', 'BBAI', 'BBAR', 'BBBY', 'BBCP', 'BBD', 'BBDC', 'BBGI', 'BBIO', 'BBLG',
  'BBSI', 'BBU', 'BBVA', 'BBWI', 'BBY', 'BC', 'BCAB', 'BCBP', 'BCC', 'BCDA',
  'BCE', 'BCEL', 'BCH', 'BCLI', 'BCML', 'BCO', 'BCOV', 'BCOW', 'BCPC', 'BCRX',
  'BCS', 'BCYC', 'BDC', 'BDJ', 'BDL', 'BDN', 'BDRY', 'BDSX', 'BDTX', 'BDX',
  'BEAM', 'BEAT', 'BECN', 'BEDU', 'BEEM', 'BEKE', 'BELFA', 'BELFB', 'BEN', 'BEP',
  'BEPC', 'BERY', 'BEST', 'BETZ', 'BF.A', 'BF.B', 'BFAM', 'BFC', 'BFH', 'BFI',
  'BFIN', 'BFLY', 'BFRI', 'BFST', 'BFS', 'BFST', 'BFZ', 'BG', 'BGB', 'BGCP',
  'BGFV', 'BGG', 'BGLC', 'BGNE', 'BGR', 'BGS', 'BGSF', 'BGT', 'BGX', 'BGXX',
  'BGY', 'BH', 'BHAC', 'BHAT', 'BHB', 'BHC', 'BHE', 'BHF', 'BHFAL', 'BHG',
  'BHIL', 'BHK', 'BHLB', 'BHP', 'BHR', 'BHRB', 'BHV', 'BHVN', 'BIAF', 'BIDU',
  'BIG', 'BIGC', 'BIGZ', 'BIIB', 'BILI', 'BILL', 'BIMI', 'BIO', 'BIOC', 'BIOL',
  'BIOR', 'BIOX', 'BIP', 'BIPC', 'BIRD', 'BIRK', 'BIT', 'BITF', 'BITI', 'BITO',
  'BITR', 'BIVI', 'BJ', 'BJDX', 'BJRI', 'BK', 'BKCC', 'BKD', 'BKE', 'BKEP',
  'BKH', 'BKKT', 'BKLC', 'BKNG', 'BKR', 'BKSC', 'BKSY', 'BKT', 'BKTI', 'BKU',
  'BKYI', 'BL', 'BLBD', 'BLBX', 'BLCO', 'BLD', 'BLDE', 'BLDP', 'BLDR', 'BLE',
  'BLFS', 'BLFY', 'BLIN', 'BLK', 'BLKB', 'BLL', 'BLMN', 'BLND', 'BLNG', 'BLNK',
  'BLPH', 'BLRX', 'BLSA', 'BLTE', 'BLUE', 'BLX', 'BLZE', 'BMA', 'BMBL', 'BMEA',
  'BMI', 'BMLP', 'BMO', 'BMRA', 'BMRC', 'BMRN', 'BMTX', 'BMY', 'BNFT', 'BNGO',
  'BNL', 'BNOX', 'BNR', 'BNRE', 'BNRG', 'BNS', 'BNTC', 'BNTX', 'BOCH', 'BOCN',
  'BODY', 'BOH', 'BOKF', 'BOLT', 'BON', 'BOOM', 'BOOT', 'BORR', 'BOSC', 'BOTJ',
  'BOWL', 'BOX', 'BOXL', 'BP', 'BPMC', 'BPMP', 'BPOP', 'BPRN', 'BPT', 'BPTH',
  'BPTY', 'BQ', 'BR', 'BRAC', 'BRAG', 'BRBR', 'BRBS', 'BRC', 'BRDG', 'BREZ',
  'BRFS', 'BRG', 'BRID', 'BRIE', 'BRKH', 'BRKL', 'BRKR', 'BRKS', 'BRO', 'BROG',
  'BROS', 'BRP', 'BRPM', 'BRSP', 'BRT', 'BRTX', 'BRX', 'BRY', 'BRZE', 'BSAC',
  'BSBK', 'BSBE', 'BSBR', 'BSET', 'BSFC', 'BSGM', 'BSIG', 'BSL', 'BSM', 'BSRR',
  'BSTZ', 'BSX', 'BSY', 'BTA', 'BTAI', 'BTBT', 'BTCS', 'BTCT', 'BTCY', 'BTDR',
  'BTE', 'BTG', 'BTI', 'BTM', 'BTO', 'BTOG', 'BTRS', 'BTSG', 'BTTX', 'BTU',
  'BTWN', 'BTZ', 'BUD', 'BUI', 'BUNL', 'BURL', 'BUSE', 'BV', 'BVH', 'BVIC',
  'BVN', 'BVS', 'BVSN', 'BW', 'BWA', 'BWAC', 'BWAY', 'BWB', 'BWBBP', 'BWEN',
  'BWFG', 'BWG', 'BWIN', 'BWLP', 'BWMN', 'BWMX', 'BWNB', 'BWV', 'BWXT', 'BX',
  'BXC', 'BXMT', 'BXP', 'BXSL', 'BY', 'BYD', 'BYFC', 'BYM', 'BYN', 'BYND',
  'BYNO', 'BYSI', 'BZ', 'BZFD', 'BZH', 'BZUN', 'C', 'CAAP', 'CAAS', 'CABA'
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

function classifyStock(ticker, response) {
  // Check API response for classification
  const classification = response.classification?.toLowerCase() || 'value';
  const methods = response.available_methods || [];

  return {
    ticker,
    classification,
    methodCount: methods.length,
    methods: methods.map(m => m.id),
    hasGrowthDCF: methods.some(m => m.id.startsWith('growth-dcf-8y')),
    hasDCFMethods: methods.some(m =>
      ['dcf-fcf-20', 'dcf-terminal-fcf', 'dni-20', 'dfcf-terminal'].includes(m.id)
    ),
    hasDuplicates: methods.length !== new Set(methods.map(m => m.id)).size
  };
}

function validateMethodCount(result) {
  const { classification, methodCount, methods, hasGrowthDCF, hasDCFMethods, hasDuplicates } = result;
  const expected = EXPECTED_COUNTS[classification] || EXPECTED_COUNTS.value;

  const issues = [];

  // Check method count
  if (methodCount < expected.min || methodCount > expected.max) {
    issues.push(`Wrong count: ${methodCount} (expected ${expected.min}-${expected.max})`);
  }

  // Check blocked methods for banks
  if (classification === 'bank' && hasDCFMethods) {
    const blockedFound = methods.filter(m => expected.blocked.includes(m));
    issues.push(`DCF methods not blocked: ${blockedFound.join(', ')}`);
  }

  // Check required methods for growth stocks
  if (classification === 'growth' && expected.required) {
    const missingRequired = expected.required.filter(m => !methods.includes(m));
    if (missingRequired.length > 0) {
      issues.push(`Missing required: ${missingRequired.join(', ')}`);
    }
  }

  // Check for duplicates
  if (hasDuplicates) {
    issues.push('Duplicate methods found');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

async function testStock(ticker) {
  const url = `${BASE_URL}/api/iv/${ticker}/chart`;

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      return {
        ticker,
        status: response.status,
        error: `HTTP ${response.status}`,
        classification: 'unknown',
        methodCount: 0,
        valid: false
      };
    }

    const data = await response.json();
    const result = classifyStock(ticker, data);
    const validation = validateMethodCount(result);

    return {
      ...result,
      status: 200,
      valid: validation.valid,
      issues: validation.issues
    };
  } catch (error) {
    return {
      ticker,
      status: 0,
      error: error.message,
      classification: 'unknown',
      methodCount: 0,
      valid: false
    };
  }
}

async function runValidation() {
  console.log('🔍 FASE 1 - Agent 1.2: Method Availability Validation');
  console.log(`📊 Testing ${STOCK_UNIVERSE.length} stocks`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('');

  const results = [];
  const stats = {
    total: STOCK_UNIVERSE.length,
    tested: 0,
    valid: 0,
    invalid: 0,
    errors: 0,
    byClassification: {
      bank: { total: 0, valid: 0, avgMethods: 0 },
      reit: { total: 0, valid: 0, avgMethods: 0 },
      growth: { total: 0, valid: 0, avgMethods: 0 },
      value: { total: 0, valid: 0, avgMethods: 0 }
    }
  };

  // Test all stocks
  for (let i = 0; i < STOCK_UNIVERSE.length; i++) {
    const ticker = STOCK_UNIVERSE[i];
    const result = await testStock(ticker);
    results.push(result);

    stats.tested++;

    if (result.status === 200) {
      if (result.valid) {
        stats.valid++;
      } else {
        stats.invalid++;
      }

      // Update classification stats
      const classStats = stats.byClassification[result.classification];
      if (classStats) {
        classStats.total++;
        if (result.valid) classStats.valid++;
        classStats.avgMethods += result.methodCount;
      }
    } else {
      stats.errors++;
    }

    // Progress indicator
    if ((i + 1) % 100 === 0 || i === STOCK_UNIVERSE.length - 1) {
      const pct = ((i + 1) / STOCK_UNIVERSE.length * 100).toFixed(1);
      console.log(`Progress: ${i + 1}/${STOCK_UNIVERSE.length} (${pct}%) - Valid: ${stats.valid} | Invalid: ${stats.invalid} | Errors: ${stats.errors}`);
    }

    await delay(DELAY_MS);
  }

  // Calculate averages
  Object.keys(stats.byClassification).forEach(key => {
    const classStats = stats.byClassification[key];
    if (classStats.total > 0) {
      classStats.avgMethods = (classStats.avgMethods / classStats.total).toFixed(2);
    }
  });

  return { results, stats };
}

function generateReport(results, stats) {
  const passRate = (stats.valid / stats.total * 100).toFixed(2);
  const status = passRate >= 95 ? '✅ PASS' : passRate >= 90 ? '⚠️ PARTIAL' : '❌ FAIL';

  let report = `# FASE 1 - Agent 1.2: Method Availability Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Status:** ${status}\n\n`;

  report += `## Summary\n`;
  report += `- **Total tested:** ${stats.total}\n`;
  report += `- **Correct method count:** ${stats.valid} (${passRate}%)\n`;
  report += `- **Incorrect method count:** ${stats.invalid}\n`;
  report += `- **Errors:** ${stats.errors}\n\n`;

  report += `## By Classification\n\n`;
  Object.keys(stats.byClassification).forEach(key => {
    const s = stats.byClassification[key];
    const expected = EXPECTED_COUNTS[key];
    const pct = s.total > 0 ? (s.valid / s.total * 100).toFixed(1) : '0.0';

    report += `### ${key.toUpperCase()}\n`;
    report += `- **Total:** ${s.total}\n`;
    report += `- **Valid:** ${s.valid} (${pct}%)\n`;
    report += `- **Avg methods:** ${s.avgMethods}\n`;
    report += `- **Expected:** ${expected.min}-${expected.max} methods\n`;

    if (key === 'bank') {
      const banksWithDCF = results.filter(r =>
        r.classification === 'bank' && r.hasDCFMethods
      );
      report += `- **DCF blocked:** ${banksWithDCF.length === 0 ? 'YES ✅' : `NO ❌ (${banksWithDCF.length} violations)`}\n`;
    }

    if (key === 'growth') {
      const growthWithDCF = results.filter(r =>
        r.classification === 'growth' && r.hasGrowthDCF
      );
      const growthTotal = results.filter(r => r.classification === 'growth').length;
      const pctWithDCF = growthTotal > 0 ? (growthWithDCF.length / growthTotal * 100).toFixed(1) : '0.0';
      report += `- **Growth DCF 8Y:** ${growthWithDCF.length}/${growthTotal} (${pctWithDCF}%)\n`;
    }

    report += `\n`;
  });

  // Top issues
  const issuesByTicker = results
    .filter(r => !r.valid && r.status === 200)
    .map(r => ({
      ticker: r.ticker,
      classification: r.classification,
      methodCount: r.methodCount,
      issues: r.issues || []
    }))
    .slice(0, 20);

  if (issuesByTicker.length > 0) {
    report += `## Top Issues Found (${issuesByTicker.length})\n\n`;
    issuesByTicker.forEach(item => {
      report += `**${item.ticker}** (${item.classification}, ${item.methodCount} methods)\n`;
      item.issues.forEach(issue => {
        report += `  - ${issue}\n`;
      });
      report += `\n`;
    });
  }

  // Recommendations
  report += `## Recommendations\n\n`;

  if (stats.byClassification.bank.total > 0) {
    const banksWithDCF = results.filter(r => r.classification === 'bank' && r.hasDCFMethods);
    if (banksWithDCF.length > 0) {
      report += `### P0: Fix DCF blocking for banks\n`;
      report += `${banksWithDCF.length} banks still have DCF methods available. These should be blocked.\n`;
      report += `Affected: ${banksWithDCF.map(r => r.ticker).join(', ')}\n\n`;
    }
  }

  const growthWithoutDCF = results.filter(r =>
    r.classification === 'growth' && !r.hasGrowthDCF && r.status === 200
  );
  if (growthWithoutDCF.length > 0) {
    report += `### P1: Add Growth DCF 8Y to growth stocks\n`;
    report += `${growthWithoutDCF.length} growth stocks missing Growth DCF 8Y method.\n`;
    report += `Affected: ${growthWithoutDCF.slice(0, 10).map(r => r.ticker).join(', ')}${growthWithoutDCF.length > 10 ? '...' : ''}\n\n`;
  }

  if (stats.invalid > stats.total * 0.05) {
    report += `### P2: Review method count logic\n`;
    report += `${stats.invalid} stocks (${(stats.invalid / stats.total * 100).toFixed(1)}%) have incorrect method counts.\n`;
    report += `This suggests systematic issues in method availability logic.\n\n`;
  }

  return report;
}

function generateMatrix(results) {
  let csv = 'ticker,classification,method_count,valid,has_growth_dcf,has_dcf_methods,has_duplicates,issues\n';

  results.forEach(r => {
    if (r.status === 200) {
      csv += `${r.ticker},${r.classification},${r.methodCount},${r.valid},${r.hasGrowthDCF},${r.hasDCFMethods},${r.hasDuplicates},"${(r.issues || []).join('; ')}"\n`;
    }
  });

  return csv;
}

// Main execution
(async () => {
  try {
    const { results, stats } = await runValidation();

    // Generate outputs
    const report = generateReport(results, stats);
    const matrix = generateMatrix(results);

    // Get output path from CLI args
    const outputArg = process.argv.find(arg => arg.startsWith('--output='));
    const outputPath = outputArg
      ? outputArg.split('=')[1]
      : path.join(process.cwd(), 'validation-results', 'FASE1_AGENT2_METHOD_AVAILABILITY_RESULTS.json');

    const outputDir = path.dirname(outputPath);
    const reportPath = path.join(outputDir, 'FASE1_AGENT2_METHOD_AVAILABILITY_REPORT.md');
    const matrixPath = path.join(outputDir, 'FASE1_AGENT2_METHOD_CLASSIFICATION_MATRIX.csv');

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write files
    fs.writeFileSync(outputPath, JSON.stringify({ results, stats }, null, 2));
    fs.writeFileSync(reportPath, report);
    fs.writeFileSync(matrixPath, matrix);

    console.log('\n✅ Validation complete!');
    console.log(`📊 Results: ${outputPath}`);
    console.log(`📄 Report: ${reportPath}`);
    console.log(`📈 Matrix: ${matrixPath}`);

    // Print summary
    const passRate = (stats.valid / stats.total * 100).toFixed(2);
    console.log(`\n🎯 Pass rate: ${stats.valid}/${stats.total} (${passRate}%)`);
    console.log(`Status: ${passRate >= 95 ? '✅ PASS' : passRate >= 90 ? '⚠️ PARTIAL' : '❌ FAIL'}`);

    process.exit(passRate >= 90 ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
})();
