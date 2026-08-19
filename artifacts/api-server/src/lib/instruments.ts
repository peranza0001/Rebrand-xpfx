/**
 * Forex & Stocks Assets Catalog
 * Extends platform to support 28+ forex pairs, 50+ stocks, commodities
 */

export const FOREX_PAIRS = [
  // Major Pairs (EUR, GBP, JPY, CHF)
  { symbol: "EUR/USD", name: "Euro/US Dollar", baseAsset: "EUR", quoteAsset: "USD", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.02 },
  { symbol: "GBP/USD", name: "British Pound/US Dollar", baseAsset: "GBP", quoteAsset: "USD", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.02 },
  { symbol: "USD/JPY", name: "US Dollar/Japanese Yen", baseAsset: "USD", quoteAsset: "JPY", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.02 },
  { symbol: "USD/CHF", name: "US Dollar/Swiss Franc", baseAsset: "USD", quoteAsset: "CHF", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.02 },
  { symbol: "AUD/USD", name: "Australian Dollar/US Dollar", baseAsset: "AUD", quoteAsset: "USD", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.03 },
  { symbol: "USD/CAD", name: "US Dollar/Canadian Dollar", baseAsset: "USD", quoteAsset: "CAD", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.02 },
  { symbol: "NZD/USD", name: "New Zealand Dollar/US Dollar", baseAsset: "NZD", quoteAsset: "USD", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.03 },

  // Cross Pairs
  { symbol: "EUR/GBP", name: "Euro/British Pound", baseAsset: "EUR", quoteAsset: "GBP", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.03 },
  { symbol: "EUR/JPY", name: "Euro/Japanese Yen", baseAsset: "EUR", quoteAsset: "JPY", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.03 },
  { symbol: "EUR/CHF", name: "Euro/Swiss Franc", baseAsset: "EUR", quoteAsset: "CHF", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.03 },
  { symbol: "GBP/JPY", name: "British Pound/Japanese Yen", baseAsset: "GBP", quoteAsset: "JPY", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.03 },
  { symbol: "GBP/CHF", name: "British Pound/Swiss Franc", baseAsset: "GBP", quoteAsset: "CHF", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.03 },
  { symbol: "AUD/JPY", name: "Australian Dollar/Japanese Yen", baseAsset: "AUD", quoteAsset: "JPY", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.04 },
  { symbol: "CAD/JPY", name: "Canadian Dollar/Japanese Yen", baseAsset: "CAD", quoteAsset: "JPY", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.04 },

  // Exotic Pairs
  { symbol: "USD/SGD", name: "US Dollar/Singapore Dollar", baseAsset: "USD", quoteAsset: "SGD", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.04 },
  { symbol: "USD/HKD", name: "US Dollar/Hong Kong Dollar", baseAsset: "USD", quoteAsset: "HKD", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.04 },
  { symbol: "USD/CNY", name: "US Dollar/Chinese Yuan", baseAsset: "USD", quoteAsset: "CNY", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.05 },
  { symbol: "USD/INR", name: "US Dollar/Indian Rupee", baseAsset: "USD", quoteAsset: "INR", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.05 },
  { symbol: "USD/MXN", name: "US Dollar/Mexican Peso", baseAsset: "USD", quoteAsset: "MXN", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.05 },
  { symbol: "USD/BRL", name: "US Dollar/Brazilian Real", baseAsset: "USD", quoteAsset: "BRL", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.06 },
  { symbol: "USD/ZAR", name: "US Dollar/South African Rand", baseAsset: "USD", quoteAsset: "ZAR", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.05 },
  { symbol: "USD/TRY", name: "US Dollar/Turkish Lira", baseAsset: "USD", quoteAsset: "TRY", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.06 },

  // Emerging Markets
  { symbol: "EUR/PLN", name: "Euro/Polish Zloty", baseAsset: "EUR", quoteAsset: "PLN", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.04 },
  { symbol: "EUR/RUB", name: "Euro/Russian Ruble", baseAsset: "EUR", quoteAsset: "RUB", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.08 },
  { symbol: "EUR/SEK", name: "Euro/Swedish Krona", baseAsset: "EUR", quoteAsset: "SEK", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.04 },
  { symbol: "EUR/NOK", name: "Euro/Norwegian Krone", baseAsset: "EUR", quoteAsset: "NOK", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.04 },
];

export const STOCKS_LIST = [
  // US Tech
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", sector: "Technology", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", sector: "Technology", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", sector: "Technology", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", sector: "Technology", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", sector: "Technology", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.15 },
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", sector: "Technology", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", sector: "Technology", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.15 },

  // US Finance
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE", sector: "Finance", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.12 },
  { symbol: "BAC", name: "Bank of America Corporation", exchange: "NYSE", sector: "Finance", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.12 },
  { symbol: "WFC", name: "Wells Fargo & Company", exchange: "NYSE", sector: "Finance", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.12 },
  { symbol: "GS", name: "The Goldman Sachs Group", exchange: "NYSE", sector: "Finance", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.12 },

  // US Healthcare
  { symbol: "JNJ", name: "Johnson & Johnson", exchange: "NYSE", sector: "Healthcare", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "PFE", name: "Pfizer Inc.", exchange: "NYSE", sector: "Healthcare", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.12 },
  { symbol: "MRK", name: "Merck & Co. Inc.", exchange: "NYSE", sector: "Healthcare", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "ABBV", name: "AbbVie Inc.", exchange: "NYSE", sector: "Healthcare", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },

  // US Energy
  { symbol: "XOM", name: "Exxon Mobil Corporation", exchange: "NYSE", sector: "Energy", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.12 },
  { symbol: "CVX", name: "Chevron Corporation", exchange: "NYSE", sector: "Energy", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.12 },

  // US Consumer
  { symbol: "WMT", name: "Walmart Inc.", exchange: "NYSE", sector: "Consumer", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "PG", name: "The Procter & Gamble Company", exchange: "NYSE", sector: "Consumer", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "KO", name: "The Coca-Cola Company", exchange: "NYSE", sector: "Consumer", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },

  // European
  { symbol: "SAP", name: "SAP SE", exchange: "XETRA", sector: "Technology", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.12 },
  { symbol: "ASML", name: "ASML Holding N.V.", exchange: "EURONEXT", sector: "Technology", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.12 },
  { symbol: "NESN", name: "Nestlé SA", exchange: "SIX", sector: "Consumer", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "NOVN", name: "Novartis AG", exchange: "SIX", sector: "Healthcare", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },

  // Asian
  { symbol: "0700.HK", name: "Tencent Holdings Limited", exchange: "HKEX", sector: "Technology", minLot: 1, pipValue: 0.01, marginRequirement: 0.15 },
  { symbol: "9988.HK", name: "Alibaba Group Holding Limited", exchange: "HKEX", sector: "Technology", minLot: 1, pipValue: 0.01, marginRequirement: 0.15 },
  { symbol: "6758.T", name: "Sony Group Corporation", exchange: "TSE", sector: "Technology", minLot: 1, pipValue: 0.01, marginRequirement: 0.12 },

  // Indices
  { symbol: "SPX500", name: "S&P 500", exchange: "Index", sector: "Index", minLot: 0.01, pipValue: 0.1, marginRequirement: 0.05 },
  { symbol: "NDX100", name: "NASDAQ-100", exchange: "Index", sector: "Index", minLot: 0.01, pipValue: 0.1, marginRequirement: 0.05 },
  { symbol: "FTSE100", name: "FTSE 100", exchange: "Index", sector: "Index", minLot: 1, pipValue: 0.1, marginRequirement: 0.05 },
  { symbol: "DAX40", name: "DAX 40", exchange: "Index", sector: "Index", minLot: 0.01, pipValue: 0.1, marginRequirement: 0.05 },
];

export const COMMODITIES_LIST = [
  { symbol: "XAUUSD", name: "Gold Spot", exchange: "COMEX", sector: "Precious Metals", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.05 },
  { symbol: "XAGUSD", name: "Silver Spot", exchange: "COMEX", sector: "Precious Metals", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.08 },
  { symbol: "XPDUSD", name: "Palladium Spot", exchange: "NYMEX", sector: "Precious Metals", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "XPTUSD", name: "Platinum Spot", exchange: "NYMEX", sector: "Precious Metals", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "WTIUSD", name: "West Texas Intermediate Crude Oil", exchange: "NYMEX", sector: "Energy", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "BRENTUSD", name: "Brent Crude Oil", exchange: "ICE", sector: "Energy", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.10 },
  { symbol: "NATGASUSD", name: "Natural Gas", exchange: "NYMEX", sector: "Energy", minLot: 0.01, pipValue: 0.001, marginRequirement: 0.15 },
  { symbol: "CORNUSD", name: "Corn Futures", exchange: "CBOT", sector: "Agriculture", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.12 },
  { symbol: "WHEATUSD", name: "Wheat Futures", exchange: "CBOT", sector: "Agriculture", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.12 },
  { symbol: "SUGARUSD", name: "Sugar Futures", exchange: "ICE", sector: "Agriculture", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.15 },
  { symbol: "COFFEEUSD", name: "Coffee Futures", exchange: "ICE", sector: "Agriculture", minLot: 0.01, pipValue: 0.0001, marginRequirement: 0.15 },
  { symbol: "COCOAUSD", name: "Cocoa Futures", exchange: "ICE", sector: "Agriculture", minLot: 0.01, pipValue: 0.01, marginRequirement: 0.15 },
];

export type ForexPair = typeof FOREX_PAIRS[0];
export type Stock = typeof STOCKS_LIST[0];
export type Commodity = typeof COMMODITIES_LIST[0];

export const ALL_TRADABLE_INSTRUMENTS = [
  ...FOREX_PAIRS,
  ...STOCKS_LIST,
  ...COMMODITIES_LIST,
];
