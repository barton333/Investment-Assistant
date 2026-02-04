
import { Asset, PricePoint } from '../types';
import { fetchLatestPricesViaAI } from './geminiService';

const STORAGE_KEY = 'invest_pilot_prices_v4'; // Legacy price-only cache
const ASSET_CACHE_KEY = 'invest_pilot_assets_cache_v3'; // Full state cache

// Backup Base Prices
const BASE_PRICES: Record<string, number> = {
  sh_composite: 3310.25, sh_gold: 628.50, sh_silver: 7.95, sh_copper: 76200.00, sh_oil: 592.10,
  usd_cny: 7.2850, eur_usd: 1.08, gbp_usd: 1.30, usd_jpy: 150.00,
  nasdaq: 20100.00, dow: 42300.00, sp500: 5800.00, hsi: 20500.00, nikkei: 38000.00,
  btc: 68500.00, eth: 2600.00, sol: 150.00,
  aapl: 230.00, nvda: 140.00, tsla: 220.00, msft: 420.00, us10y: 4.25,
};

// --- CACHE SYSTEM ---
const loadCache = (): Record<string, number> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {} as Record<string, number>;
  } catch (e) { return {}; }
};

const saveCache = (newPrices: Record<string, number>) => {
  try {
    const current = loadCache();
    const updated = { ...current, ...newPrices };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
};

const saveAssetsCache = (assets: Asset[]) => {
  try {
    localStorage.setItem(ASSET_CACHE_KEY, JSON.stringify(assets));
  } catch (e) {
    console.warn("Failed to save asset cache", e);
  }
};

export const generateHistory = (basePrice: number, points = 24): PricePoint[] => {
  const history: PricePoint[] = [];
  let currentPrice = basePrice || 100;
  const now = new Date();
  const volFactor = currentPrice > 1000 ? 0.002 : 0.005;
  
  for (let i = points; i > 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const change = (Math.random() - 0.5) * (currentPrice * volFactor);
    currentPrice += change;
    history.push({
      time: `${time.getHours()}:00`,
      value: parseFloat(currentPrice.toFixed(4))
    });
  }
  return history;
};

export const getHistoryForTimeframe = (basePrice: number, timeframe: string): PricePoint[] => {
  const now = new Date();
  let points = 30;
  let interval = 24 * 60 * 60 * 1000;
  let formatTime = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
  let volatilityFactor = 0.08;

  switch (timeframe) {
    case '1H': points=60; interval=60*1000; formatTime=(d)=>`${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`; volatilityFactor=0.005; break;
    case '1D': points=24; interval=60*60*1000; formatTime=(d)=>`${d.getHours()}:00`; volatilityFactor=0.02; break;
    case '1W': points=7; interval=24*60*60*1000; formatTime=(d)=>`${d.getMonth()+1}/${d.getDate()}`; volatilityFactor=0.03; break;
    case '1M': points=30; interval=24*60*60*1000; formatTime=(d)=>`${d.getMonth()+1}/${d.getDate()}`; volatilityFactor=0.08; break;
    case '1Y': points=12; interval=30*24*60*60*1000; formatTime=(d)=>`${d.getFullYear()}-${d.getMonth()+1}`; volatilityFactor=0.20; break;
  }

  const history: PricePoint[] = [];
  let tempPrice = basePrice || 100;
  history.unshift({ time: formatTime(now), value: Number(tempPrice.toFixed(4)) });

  for (let i = 1; i < points; i++) {
    const time = new Date(now.getTime() - i * interval);
    const change = (Math.random() - 0.5) * (tempPrice * volatilityFactor * (2.5 / Math.sqrt(points)));
    tempPrice -= change;
    if (tempPrice < 0) tempPrice = 0.01;
    history.unshift({ time: formatTime(time), value: Number(tempPrice.toFixed(4)) });
  }
  return history;
};

// --- EXPANDED ASSET LIST (Top 100 Candidates) ---
const ALL_POSSIBLE_ASSETS: Asset[] = [
    // 1. Domestic & Commodities (SHFE/INE)
    { id: 'sh_composite', symbol: '000001.SS', name: 'SSE Composite', nameCN: '上证指数', category: 'index', unit: 'Points', price: BASE_PRICES.sh_composite, change: 0, changePercent: 0, history: generateHistory(BASE_PRICES.sh_composite) },
    { id: 'sz_component', symbol: '399001.SZ', name: 'SZSE Component', nameCN: '深证成指', category: 'index', unit: 'Points', price: 10500, change: 0, changePercent: 0, history: generateHistory(10500) },
    { id: 'sh_gold', symbol: 'SHFE.AU', name: 'Shanghai Gold', nameCN: '上海黄金', category: 'metal', unit: 'CNY/g', price: BASE_PRICES.sh_gold, change: 0, changePercent: 0, history: generateHistory(BASE_PRICES.sh_gold) },
    { id: 'sh_silver', symbol: 'SHFE.AG', name: 'Shanghai Silver', nameCN: '上海白银', category: 'metal', unit: 'CNY/g', price: BASE_PRICES.sh_silver, change: 0, changePercent: 0, history: generateHistory(BASE_PRICES.sh_silver) },
    { id: 'sh_copper', symbol: 'SHFE.CU', name: 'Shanghai Copper', nameCN: '上海紫铜', category: 'metal', unit: 'CNY/ton', price: BASE_PRICES.sh_copper, change: 0, changePercent: 0, history: generateHistory(BASE_PRICES.sh_copper) },
    { id: 'sh_oil', symbol: 'INE.SC', name: 'Shanghai Crude', nameCN: '上海原油', category: 'energy', unit: 'CNY/bbl', price: BASE_PRICES.sh_oil, change: 0, changePercent: 0, history: generateHistory(BASE_PRICES.sh_oil) },
    { id: 'sh_aluminum', symbol: 'SHFE.AL', name: 'Shanghai Aluminum', nameCN: '上海铝', category: 'metal', unit: 'CNY/ton', price: 20500, change: 0, changePercent: 0, history: generateHistory(20500) },
    { id: 'sh_zinc', symbol: 'SHFE.ZN', name: 'Shanghai Zinc', nameCN: '上海锌', category: 'metal', unit: 'CNY/ton', price: 25000, change: 0, changePercent: 0, history: generateHistory(25000) },
    { id: 'sh_lead', symbol: 'SHFE.PB', name: 'Shanghai Lead', nameCN: '上海铅', category: 'metal', unit: 'CNY/ton', price: 16500, change: 0, changePercent: 0, history: generateHistory(16500) },
    { id: 'sh_nickel', symbol: 'SHFE.NI', name: 'Shanghai Nickel', nameCN: '上海镍', category: 'metal', unit: 'CNY/ton', price: 130000, change: 0, changePercent: 0, history: generateHistory(130000) },
    { id: 'sh_tin', symbol: 'SHFE.SN', name: 'Shanghai Tin', nameCN: '上海锡', category: 'metal', unit: 'CNY/ton', price: 260000, change: 0, changePercent: 0, history: generateHistory(260000) },
    
    // 2. US Tech (Mag 7 + Popular)
    { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA', nameCN: '英伟达', category: 'stock', unit: 'USD', price: 140.00, change: 0, changePercent: 0, history: generateHistory(140) },
    { id: 'aapl', symbol: 'AAPL', name: 'Apple', nameCN: '苹果', category: 'stock', unit: 'USD', price: 230.00, change: 0, changePercent: 0, history: generateHistory(230) },
    { id: 'msft', symbol: 'MSFT', name: 'Microsoft', nameCN: '微软', category: 'stock', unit: 'USD', price: 420.00, change: 0, changePercent: 0, history: generateHistory(420) },
    { id: 'goog', symbol: 'GOOGL', name: 'Alphabet', nameCN: '谷歌', category: 'stock', unit: 'USD', price: 165.00, change: 0, changePercent: 0, history: generateHistory(165) },
    { id: 'amzn', symbol: 'AMZN', name: 'Amazon', nameCN: '亚马逊', category: 'stock', unit: 'USD', price: 185.00, change: 0, changePercent: 0, history: generateHistory(185) },
    { id: 'tsla', symbol: 'TSLA', name: 'Tesla', nameCN: '特斯拉', category: 'stock', unit: 'USD', price: 220.00, change: 0, changePercent: 0, history: generateHistory(220) },
    { id: 'meta', symbol: 'META', name: 'Meta', nameCN: 'Meta', category: 'stock', unit: 'USD', price: 580.00, change: 0, changePercent: 0, history: generateHistory(580) },
    { id: 'nflx', symbol: 'NFLX', name: 'Netflix', nameCN: '奈飞', category: 'stock', unit: 'USD', price: 700.00, change: 0, changePercent: 0, history: generateHistory(700) },
    { id: 'adbe', symbol: 'ADBE', name: 'Adobe', nameCN: 'Adobe', category: 'stock', unit: 'USD', price: 500.00, change: 0, changePercent: 0, history: generateHistory(500) },
    { id: 'crm', symbol: 'CRM', name: 'Salesforce', nameCN: '赛富时', category: 'stock', unit: 'USD', price: 280.00, change: 0, changePercent: 0, history: generateHistory(280) },
    { id: 'orcl', symbol: 'ORCL', name: 'Oracle', nameCN: '甲骨文', category: 'stock', unit: 'USD', price: 170.00, change: 0, changePercent: 0, history: generateHistory(170) },
    { id: 'avgo', symbol: 'AVGO', name: 'Broadcom', nameCN: '博通', category: 'stock', unit: 'USD', price: 160.00, change: 0, changePercent: 0, history: generateHistory(160) },

    // 3. Crypto Top
    { id: 'btc', symbol: 'BTC/USD', name: 'Bitcoin', nameCN: '比特币', category: 'crypto', unit: 'USD', price: 68500, change: 0, changePercent: 0, history: generateHistory(68500) },
    { id: 'eth', symbol: 'ETH/USD', name: 'Ethereum', nameCN: '以太坊', category: 'crypto', unit: 'USD', price: 2600, change: 0, changePercent: 0, history: generateHistory(2600) },
    { id: 'sol', symbol: 'SOL/USD', name: 'Solana', nameCN: '索拉纳', category: 'crypto', unit: 'USD', price: 150, change: 0, changePercent: 0, history: generateHistory(150) },
    { id: 'bnb', symbol: 'BNB/USD', name: 'Binance Coin', nameCN: 'BNB', category: 'crypto', unit: 'USD', price: 600, change: 0, changePercent: 0, history: generateHistory(600) },
    { id: 'doge', symbol: 'DOGE/USD', name: 'Dogecoin', nameCN: '狗狗币', category: 'crypto', unit: 'USD', price: 0.14, change: 0, changePercent: 0, history: generateHistory(0.14) },
    { id: 'xrp', symbol: 'XRP/USD', name: 'Ripple', nameCN: '瑞波币', category: 'crypto', unit: 'USD', price: 0.54, change: 0, changePercent: 0, history: generateHistory(0.54) },
    { id: 'ada', symbol: 'ADA/USD', name: 'Cardano', nameCN: '艾达币', category: 'crypto', unit: 'USD', price: 0.35, change: 0, changePercent: 0, history: generateHistory(0.35) },
    { id: 'dot', symbol: 'DOT/USD', name: 'Polkadot', nameCN: '波卡', category: 'crypto', unit: 'USD', price: 4.20, change: 0, changePercent: 0, history: generateHistory(4.20) },
    { id: 'matic', symbol: 'MATIC/USD', name: 'Polygon', nameCN: '马蹄币', category: 'crypto', unit: 'USD', price: 0.38, change: 0, changePercent: 0, history: generateHistory(0.38) },
    { id: 'shib', symbol: 'SHIB/USD', name: 'Shiba Inu', nameCN: '柴犬币', category: 'crypto', unit: 'USD', price: 0.000018, change: 0, changePercent: 0, history: generateHistory(0.000018) },

    // 4. US Indices & Bonds
    { id: 'nasdaq', symbol: 'IXIC', name: 'Nasdaq', nameCN: '纳斯达克', category: 'index', unit: 'Points', price: 20100, change: 0, changePercent: 0, history: generateHistory(20100) },
    { id: 'dow', symbol: 'DJI', name: 'Dow Jones', nameCN: '道琼斯', category: 'index', unit: 'Points', price: 42300, change: 0, changePercent: 0, history: generateHistory(42300) },
    { id: 'sp500', symbol: 'SPX', name: 'S&P 500', nameCN: '标普500', category: 'index', unit: 'Points', price: 5800, change: 0, changePercent: 0, history: generateHistory(5800) },
    { id: 'us10y', symbol: 'US10Y', name: 'US 10Y Yield', nameCN: '美债10年', category: 'bond', unit: '%', price: 4.25, change: 0, changePercent: 0, history: generateHistory(4.25) },
    { id: 'vix', symbol: 'VIX', name: 'VIX', nameCN: '恐慌指数', category: 'index', unit: 'Points', price: 15, change: 0, changePercent: 0, history: generateHistory(15) },
    { id: 'rut', symbol: 'RUT', name: 'Russell 2000', nameCN: '罗素2000', category: 'index', unit: 'Points', price: 2200, change: 0, changePercent: 0, history: generateHistory(2200) },

    // 5. Global Indices
    { id: 'hsi', symbol: 'HSI', name: 'Hang Seng', nameCN: '恒生指数', category: 'index', unit: 'Points', price: 20500, change: 0, changePercent: 0, history: generateHistory(20500) },
    { id: 'hstech', symbol: 'HSTECH', name: 'Hang Seng Tech', nameCN: '恒生科技', category: 'index', unit: 'Points', price: 4500, change: 0, changePercent: 0, history: generateHistory(4500) },
    { id: 'nikkei', symbol: 'N225', name: 'Nikkei 225', nameCN: '日经225', category: 'index', unit: 'Points', price: 38000, change: 0, changePercent: 0, history: generateHistory(38000) },
    { id: 'ftse', symbol: 'UK100', name: 'FTSE 100', nameCN: '富时100', category: 'index', unit: 'Points', price: 8200, change: 0, changePercent: 0, history: generateHistory(8200) },
    { id: 'dax', symbol: 'DAX', name: 'DAX', nameCN: '德国DAX', category: 'index', unit: 'Points', price: 19400, change: 0, changePercent: 0, history: generateHistory(19400) },
    { id: 'cac', symbol: 'CAC40', name: 'CAC 40', nameCN: '法国CAC', category: 'index', unit: 'Points', price: 7500, change: 0, changePercent: 0, history: generateHistory(7500) },

    // 6. Forex
    { id: 'usd_cny', symbol: 'USDCNY', name: 'USD/CNY', nameCN: '美元/人民币', category: 'currency', unit: 'CNY', price: 7.28, change: 0, changePercent: 0, history: generateHistory(7.28) },
    { id: 'eur_usd', symbol: 'EURUSD', name: 'EUR/USD', nameCN: '欧元/美元', category: 'currency', unit: 'USD', price: 1.08, change: 0, changePercent: 0, history: generateHistory(1.08) },
    { id: 'gbp_usd', symbol: 'GBPUSD', name: 'GBP/USD', nameCN: '英镑/美元', category: 'currency', unit: 'USD', price: 1.30, change: 0, changePercent: 0, history: generateHistory(1.30) },
    { id: 'usd_jpy', symbol: 'USDJPY', name: 'USD/JPY', nameCN: '美元/日元', category: 'currency', unit: 'JPY', price: 150.00, change: 0, changePercent: 0, history: generateHistory(150.00) },
    { id: 'aud_usd', symbol: 'AUDUSD', name: 'AUD/USD', nameCN: '澳元/美元', category: 'currency', unit: 'USD', price: 0.67, change: 0, changePercent: 0, history: generateHistory(0.67) },
    { id: 'usd_cad', symbol: 'USDCAD', name: 'USD/CAD', nameCN: '美元/加元', category: 'currency', unit: 'CAD', price: 1.38, change: 0, changePercent: 0, history: generateHistory(1.38) },
    { id: 'usd_chf', symbol: 'USDCHF', name: 'USD/CHF', nameCN: '美元/瑞郎', category: 'currency', unit: 'CHF', price: 0.86, change: 0, changePercent: 0, history: generateHistory(0.86) },

    // 7. China Tech (HK/US)
    { id: 'baba', symbol: 'BABA', name: 'Alibaba', nameCN: '阿里巴巴', category: 'stock', unit: 'USD', price: 100, change: 0, changePercent: 0, history: generateHistory(100) },
    { id: 'pdd', symbol: 'PDD', name: 'Pinduoduo', nameCN: '拼多多', category: 'stock', unit: 'USD', price: 120, change: 0, changePercent: 0, history: generateHistory(120) },
    { id: 'jd', symbol: 'JD', name: 'JD.com', nameCN: '京东', category: 'stock', unit: 'USD', price: 40, change: 0, changePercent: 0, history: generateHistory(40) },
    { id: 'tencent_hk', symbol: '0700.HK', name: 'Tencent', nameCN: '腾讯控股', category: 'stock', unit: 'HKD', price: 420, change: 0, changePercent: 0, history: generateHistory(420) },
    { id: 'meituan_hk', symbol: '3690.HK', name: 'Meituan', nameCN: '美团', category: 'stock', unit: 'HKD', price: 180, change: 0, changePercent: 0, history: generateHistory(180) },
    { id: 'bidu', symbol: 'BIDU', name: 'Baidu', nameCN: '百度', category: 'stock', unit: 'USD', price: 90, change: 0, changePercent: 0, history: generateHistory(90) },

    // 8. Semiconductor
    { id: 'tsm', symbol: 'TSM', name: 'TSMC', nameCN: '台积电', category: 'stock', unit: 'USD', price: 190, change: 0, changePercent: 0, history: generateHistory(190) },
    { id: 'amd', symbol: 'AMD', name: 'AMD', nameCN: 'AMD', category: 'stock', unit: 'USD', price: 155, change: 0, changePercent: 0, history: generateHistory(155) },
    { id: 'intc', symbol: 'INTC', name: 'Intel', nameCN: '英特尔', category: 'stock', unit: 'USD', price: 23, change: 0, changePercent: 0, history: generateHistory(23) },
    { id: 'mu', symbol: 'MU', name: 'Micron', nameCN: '美光', category: 'stock', unit: 'USD', price: 110, change: 0, changePercent: 0, history: generateHistory(110) },
    { id: 'qcom', symbol: 'QCOM', name: 'Qualcomm', nameCN: '高通', category: 'stock', unit: 'USD', price: 170, change: 0, changePercent: 0, history: generateHistory(170) },

    // 9. Auto
    { id: 'li', symbol: 'LI', name: 'Li Auto', nameCN: '理想汽车', category: 'stock', unit: 'USD', price: 25, change: 0, changePercent: 0, history: generateHistory(25) },
    { id: 'nio', symbol: 'NIO', name: 'NIO', nameCN: '蔚来', category: 'stock', unit: 'USD', price: 5, change: 0, changePercent: 0, history: generateHistory(5) },
    { id: 'xpev', symbol: 'XPEV', name: 'XPeng', nameCN: '小鹏', category: 'stock', unit: 'USD', price: 10, change: 0, changePercent: 0, history: generateHistory(10) },
    { id: 'byd_hk', symbol: '1211.HK', name: 'BYD', nameCN: '比亚迪', category: 'stock', unit: 'HKD', price: 290, change: 0, changePercent: 0, history: generateHistory(290) },

    // 10. Commodities (Global)
    { id: 'gold_comex', symbol: 'GC=F', name: 'COMEX Gold', nameCN: 'COMEX黄金', category: 'metal', unit: 'USD/oz', price: 2750, change: 0, changePercent: 0, history: generateHistory(2750) },
    { id: 'silver_comex', symbol: 'SI=F', name: 'COMEX Silver', nameCN: 'COMEX白银', category: 'metal', unit: 'USD/oz', price: 34, change: 0, changePercent: 0, history: generateHistory(34) },
    { id: 'oil_wti', symbol: 'CL=F', name: 'WTI Crude', nameCN: 'WTI原油', category: 'energy', unit: 'USD/bbl', price: 70, change: 0, changePercent: 0, history: generateHistory(70) },
    { id: 'ng_comex', symbol: 'NG=F', name: 'Natural Gas', nameCN: '天然气', category: 'energy', unit: 'USD/MMBtu', price: 2.50, change: 0, changePercent: 0, history: generateHistory(2.50) },
];

export const getAllPossibleAssets = () => ALL_POSSIBLE_ASSETS;

export const getInitialAssets = (): Asset[] => {
  try {
    const saved = localStorage.getItem(ASSET_CACHE_KEY);
    if (saved) {
      const cachedAssets: Asset[] = JSON.parse(saved);
      const cacheMap = new Map(cachedAssets.map(a => [a.id, a]));
      return ALL_POSSIBLE_ASSETS.map(def => {
        const cached = cacheMap.get(def.id);
        if (cached) {
          return {
             ...def,
             price: cached.price,
             change: cached.change,
             changePercent: cached.changePercent,
             history: (cached.history && cached.history.length > 0) ? cached.history : def.history,
             lastChecked: cached.lastChecked,
             sources: cached.sources
          };
        }
        return def;
      });
    }
  } catch (e) {}
  return ALL_POSSIBLE_ASSETS;
};

// --- DATA FETCHING (SINA MAPPING) ---
const SINA_CODES_MAP: Record<string, string> = {
  // Domestic
  sh_composite: 'sh000001',
  sz_component: 'sz399001',
  sh_gold: 'nf_AU0',
  sh_silver: 'nf_AG0',
  sh_copper: 'nf_CU0',
  sh_aluminum: 'nf_AL0',
  sh_zinc: 'nf_ZN0',
  sh_lead: 'nf_PB0',
  sh_nickel: 'nf_NI0',
  sh_tin: 'nf_SN0',
  sh_oil: 'nf_SC0',
  
  // Int'l Backup for Domestic (Explicit keys for backup logic)
  hf_gold: 'hf_GC', 
  hf_silver: 'hf_SI', 
  hf_copper: 'hf_HG',
  hf_oil: 'hf_CL', 

  // Direct Int'l Commodities
  gold_comex: 'hf_GC',
  silver_comex: 'hf_SI',
  oil_wti: 'hf_CL',
  ng_comex: 'hf_NG',

  // US Indices (Sina Prefix: gb_)
  nasdaq: 'gb_ixic',
  dow: 'gb_dji',
  sp500: 'gb_ixic', // Fallback
  vix: 'gb_vix', // Check availability

  // US Tech
  nvda: 'gb_nvda', aapl: 'gb_aapl', msft: 'gb_msft', goog: 'gb_googl',
  amzn: 'gb_amzn', tsla: 'gb_tsla', meta: 'gb_meta', nflx: 'gb_nflx',
  adbe: 'gb_adbe', crm: 'gb_crm', orcl: 'gb_orcl', avgo: 'gb_avgo',
  tsm: 'gb_tsm', amd: 'gb_amd', intc: 'gb_intc', mu: 'gb_mu', qcom: 'gb_qcom',

  // China Tech (US)
  baba: 'gb_baba', pdd: 'gb_pdd', jd: 'gb_jd', li: 'gb_li', nio: 'gb_nio', xpev: 'gb_xpev', bidu: 'gb_bidu',

  // HK Stocks (Sina Prefix: rt_hk)
  hsi: 'rt_hkHSI',
  hstech: 'rt_hkHSTECH',
  tencent_hk: 'rt_hk00700',
  meituan_hk: 'rt_hk03690',
  byd_hk: 'rt_hk01211',

  // Global Indices
  nikkei: 'b_N225', 
  ftse: 'b_UKX', // FTSE 100
  dax: 'b_DAX',
  cac: 'b_CAC40',

  // Forex (Sina Prefix: fx_)
  eur_usd: 'fx_seurusd',
  gbp_usd: 'fx_sgbpusd',
  usd_jpy: 'fx_susdjpy',
  aud_usd: 'fx_saudusd',
  usd_cad: 'fx_susdcad',
  usd_chf: 'fx_susdchf',
};

const fetchSinaData = async (): Promise<Record<string, number>> => {
  // Split into chunks if too many to prevent URL length issues
  const codes = Object.values(SINA_CODES_MAP);
  const chunkedCodes = [];
  for (let i = 0; i < codes.length; i += 40) {
      chunkedCodes.push(codes.slice(i, i + 40));
  }

  const results: Record<string, number> = {};

  await Promise.all(chunkedCodes.map(chunk => {
      return new Promise<void>((resolve) => {
          const scriptId = `sina_hq_${Date.now()}_${Math.random().toString(36).substring(2)}`;
          const cleanup = () => { try { const s = document.getElementById(scriptId); if(s) s.remove(); } catch(e){} };
          const timer = setTimeout(() => { cleanup(); resolve(); }, 4000);

          try {
              const script = document.createElement('script');
              script.id = scriptId;
              script.src = `https://hq.sinajs.cn/list=${chunk.join(',')}`;
              script.charset = 'gb2312';
              script.onload = () => {
                  clearTimeout(timer);
                  const win = window as any;
                  chunk.forEach(code => {
                      const str = win[`hq_str_${code}`];
                      if (!str) return;
                      const parts = str.split(',');
                      let p = 0;
                      if (code.startsWith('nf_')) { // Domestic Future
                          const candidates = [parts[8], parts[3], parts[0]];
                          for (const c of candidates) { const v=parseFloat(c); if(!isNaN(v) && v>0) { p=v; break; } }
                      } else if (code.startsWith('hf_')) { // Global Future
                          p = parseFloat(parts[0]);
                      } else if (code.startsWith('gb_')) { // US Stock
                          p = parseFloat(parts[1]);
                      } else if (code.startsWith('rt_hk')) { // HK Stock
                          p = parseFloat(parts[6]);
                      } else if (code.startsWith('b_')) { // Global Index
                          p = parseFloat(parts[1]);
                      } else if (code.startsWith('fx_')) { // Forex
                          const c = parseFloat(parts[1]);
                          if (!isNaN(c) && c>0) p = c; else p = parseFloat(parts[3]);
                      } else if (code.startsWith('sh') || code.startsWith('sz')) { // CN Stock
                          p = parseFloat(parts[3]);
                      }
                      if (p > 0) results[code] = p;
                  });
                  cleanup();
                  resolve();
              };
              script.onerror = () => { cleanup(); resolve(); };
              document.body.appendChild(script);
          } catch(e) { cleanup(); resolve(); }
      });
  }));

  return results;
};

const fetchForexRate = async (): Promise<number> => {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD').catch(() => null);
    if (!res || !res.ok) return 0;
    const data = await res.json();
    return data.rates?.CNY || BASE_PRICES.usd_cny;
  } catch (e) { return 0; }
};

const fetchCryptoData = async (): Promise<Record<string, number>> => {
  try {
    const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,dogecoin,ripple,cardano,polkadot,matic-network,shiba-inu&vs_currencies=usd').then(r => r.json()).catch(() => null);
    const map: Record<string, number> = {};
    if (cgRes) {
      if (cgRes.bitcoin?.usd) map['btc'] = cgRes.bitcoin.usd;
      if (cgRes.ethereum?.usd) map['eth'] = cgRes.ethereum.usd;
      if (cgRes.solana?.usd) map['sol'] = cgRes.solana.usd;
      if (cgRes.binancecoin?.usd) map['bnb'] = cgRes.binancecoin.usd;
      if (cgRes.dogecoin?.usd) map['doge'] = cgRes.dogecoin.usd;
      if (cgRes.ripple?.usd) map['xrp'] = cgRes.ripple.usd;
      if (cgRes.cardano?.usd) map['ada'] = cgRes.cardano.usd;
      if (cgRes.polkadot?.usd) map['dot'] = cgRes.polkadot.usd;
      if (cgRes['matic-network']?.usd) map['matic'] = cgRes['matic-network'].usd;
      if (cgRes['shiba-inu']?.usd) map['shib'] = cgRes['shiba-inu'].usd;
    }
    return map;
  } catch (e) { return {}; }
};

export const fetchRealTimePrices = async (currentAssets: Asset[]): Promise<Asset[]> => {
  // STRICT FLOW: API -> AI -> Cache -> Offline
  try {
    // Explicitly cast to Record<string, number> in catch to satisfy strict mode
    const [sinaDataOrEmpty, cnyRate, cryptoDataOrEmpty] = await Promise.all([
      fetchSinaData().catch(() => ({} as Record<string, number>)),
      fetchForexRate().catch(() => 0),
      fetchCryptoData().catch(() => ({} as Record<string, number>))
    ]);

    const sinaData = sinaDataOrEmpty;
    const cryptoData = cryptoDataOrEmpty;
    
    const validCny = cnyRate || BASE_PRICES.usd_cny;
    const finalPrices: Record<string, number> = {};
    const finalSources: Record<string, string[]> = {};
    const missingAssets: Asset[] = [];

    const setPrice = (id: string, price: number, source: string) => {
        finalPrices[id] = price;
        finalSources[id] = [source];
    };

    const getSinaVal = (sinaKey: string) => {
        const code = SINA_CODES_MAP[sinaKey];
        return code ? sinaData[code] : undefined;
    };

    currentAssets.forEach(asset => {
        let found = false;
        
        // 1. COMMODITY BACKUP LOGIC (CRITICAL FIX)
        if (['sh_gold', 'sh_silver', 'sh_copper', 'sh_oil', 'sh_aluminum', 'sh_zinc', 'sh_lead', 'sh_nickel', 'sh_tin'].includes(asset.id)) {
            // Priority A: Domestic
            const domVal = getSinaVal(asset.id);
            if (domVal && domVal > 0) {
                let p = domVal;
                // Fix Silver Price: SHFE typically quotes in CNY/kg (e.g., 7900). Convert to g if necessary (7.9)
                // If price > 1000, assuming it's kg price.
                if (asset.id === 'sh_silver' && p > 1000) p = p/1000;
                setPrice(asset.id, p, 'Sina (SHFE)');
                found = true;
            }
            
            // Priority B: International Backup (Force switch if domestic is missing/zero)
            if (!found) {
                const intlKeyMap: Record<string, string> = { 
                    'sh_gold': 'hf_gold', 
                    'sh_silver': 'hf_silver', 
                    'sh_copper': 'hf_copper', 
                    'sh_oil': 'hf_oil' 
                };
                const iKey = intlKeyMap[asset.id];
                const iVal = iKey ? getSinaVal(iKey) : undefined;
                
                if (iVal && iVal > 0) {
                    let p = iVal;
                    // Conversions
                    if (asset.id === 'sh_gold' || asset.id === 'sh_silver') p = (p * validCny) / 31.1035;
                    if (asset.id === 'sh_copper') p = p * 2204.62 * validCny; // lb to ton
                    if (asset.id === 'sh_oil') p = p * validCny;
                    
                    // Specific Labels for Backup
                    let label = 'Global Future';
                    if (asset.id === 'sh_gold' || asset.id === 'sh_silver' || asset.id === 'sh_copper') {
                        label = 'COMEX (Int\'l)';
                    } else if (asset.id === 'sh_oil') {
                        label = 'NYMEX (Int\'l)';
                    }

                    setPrice(asset.id, p, label);
                    found = true;
                }
            }
        } 
        // 2. Mapped Assets (Stock/Index/Forex)
        else if (SINA_CODES_MAP[asset.id]) {
            const val = getSinaVal(asset.id);
            if (val && val > 0) {
                setPrice(asset.id, val, 'Sina Finance');
                found = true;
            }
        }
        // 3. Crypto
        else if (cryptoData[asset.id]) {
             setPrice(asset.id, cryptoData[asset.id], 'CoinGecko');
             found = true;
        }
        // 4. Forex USDCNY specific
        else if (asset.id === 'usd_cny') {
             if (cnyRate) { setPrice(asset.id, cnyRate, 'ExRateAPI'); found = true; }
        }

        if (!found) missingAssets.push(asset);
    });

    // 5. AI Search Fallback (Explicitly calling if enabled in geminiService)
    if (missingAssets.length > 0) {
        // Try to fetch via AI if implemented. 
        const aiPrices = await fetchLatestPricesViaAI(missingAssets);
        Object.entries(aiPrices).forEach(([id, price]) => {
             if (price > 0) setPrice(id, price, 'AI Search');
        });
    }

    // 6. Merge & Cache
    const cachedData = loadCache();
    const validNewPrices: Record<string, number> = {};

    const updatedAssets = currentAssets.map(asset => {
        let price = 0;
        let sources: string[] = [];

        if (finalPrices[asset.id]) {
            price = finalPrices[asset.id];
            sources = finalSources[asset.id];
            validNewPrices[asset.id] = price;
        } else if (cachedData[asset.id]) {
            price = cachedData[asset.id];
            sources = ['Cache'];
        } else {
            price = asset.price || BASE_PRICES[asset.id] || 0;
            sources = ['Offline'];
        }

        // History Drift
        const newHistory = [...asset.history];
        if (!sources.includes('Cache') && !sources.includes('Offline')) {
            const diff = price - (asset.price || price);
            newHistory.forEach((p, i) => newHistory[i] = { ...p, value: p.value + diff });
        }

        const open = newHistory[0]?.value || price;
        const changeVal = price - open;
        const changePct = open !== 0 ? (changeVal/open)*100 : 0;

        return {
            ...asset,
            price: parseFloat(price.toFixed(4)),
            change: parseFloat(changeVal.toFixed(4)),
            changePercent: parseFloat(changePct.toFixed(4)),
            history: newHistory,
            lastChecked: 'Now',
            sources: sources
        };
    });

    if (Object.keys(validNewPrices).length > 0) saveCache(validNewPrices);
    saveAssetsCache(updatedAssets);
    return updatedAssets;

  } catch (e) {
    console.warn("Global Fetch Error", e);
    return currentAssets;
  }
};
