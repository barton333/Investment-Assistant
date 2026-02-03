
export interface PricePoint {
  time: string;
  value: number;
}

export type AssetCategory = 'metal' | 'currency' | 'crypto' | 'energy' | 'index' | 'bond' | 'stock';

export interface Asset {
  id: string;
  symbol: string;
  name: string; // English name
  nameCN: string; // Chinese name
  price: number;
  change: number;
  changePercent: number;
  history: PricePoint[]; // For chart
  category: AssetCategory;
  unit: string; // e.g., "RMB/g", "USD", "Points"
  lastChecked?: string; // Verification timestamp
  sources?: string[]; // Provenance of data (e.g., ['Sina', 'Tencent'])
}

export interface MarketAnalysis {
  summary: string;
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  keyLevels: string;
  advice: string;
  timestamp: number;
}

export type Tab = 'market' | 'advisor' | 'settings';
export type Language = 'zh' | 'en';
export type Theme = 'light' | 'dark';
export type BadgePosition = 'name-right' | 'card-top-right' | 'card-bottom-right';

export interface AppSettings {
  language: Language;
  theme: Theme;
  dataRefreshRate: number; // milliseconds (API data fetch)
  customApiKey?: string; // User entered API Key
  apiBaseUrl?: string; // User entered Custom Proxy URL
  visibleAssets: string[]; // List of Asset IDs to display
  badgePosition: BadgePosition; // Where to show the source badge
  notifications: {
    wechat: boolean;
    sms: boolean;
    email: boolean;
    priceAlerts: boolean;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  relatedAssetId?: string; // If the message was about a specific asset
  isSeparator?: boolean; // New field to mark session breaks
}
