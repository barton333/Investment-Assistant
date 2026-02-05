
import { Asset, PricePoint } from '../types';
import { fetchLatestPricesViaAI } from './geminiService';

const STORAGE_KEY = 'invest_pilot_prices_v4'; 
const ASSET_CACHE_KEY = 'invest_pilot_assets_cache_v3'; 

// UPDATED BASE PRICES (Approximate Market Values as of Late 2024/2025)
const BASE_PRICES: Record<string, number> = {
  // China
  sh_composite: 3260.00, 
  sh_gold: 625.00, // CNY/g
  sh_silver: 7.85, // CNY/g
  sh_copper: 74000.00, 
  sh_oil: 540.00,
  
  // Forex
  usd_cny: 7.12, 
  eur_usd: 1.08, 
  gbp_usd: 1.29, 
  usd_jpy: 152.00,

  // US
  nasdaq: 18500.00, 
  dow: 42000.00, 
  sp500: 5800.00, 
  
  // Crypto
  btc: 71500.00, 
  eth: 2600.00, 
  sol: 170.00,
  
  // Stocks
  aapl: 235.00, 
  nvda: 145.00, 
  tsla: 250.00, 
  msft: 430.00, 
  us10y: 4.20,
};

const loadCache = (): Record<string, number> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {} as Record<string, number>;
  } catch (e) { return {} as Record<string, number>; }
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
  } catch (e) {}
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

// --- ASSET DEFINITIONS ---
const ALL_POSSIBLE_ASSETS: Asset[] = [
    { id: 'sh_composite', symbol: '000001.SS', name: 'SSE Composite', nameCN: '上证指数', category: 'index', unit: 'Points', price: BASE_PRICES.sh_composite, change: 0, changePercent: 0, history: generateHistory(BASE_PRICES.sh_composite) },
    { id: 'sh_gold', symbol: 'SHFE.AU', name: 'Shanghai Gold', nameCN: '上海黄金', category: 'metal', unit: 'CNY/g', price: BASE_PRICES.sh_gold, change: 0, changePercent: 0, history: generateHistory(BASE_PRICES.sh_gold) },
    { id: 'sh_silver', symbol: 'SHFE.AG', name: 'Shanghai Silver', nameCN: '上海白银', category: 'metal', unit: 'CNY/g', price: BASE_PRICES.sh_silver, change: 0, changePercent: 0, history: generateHistory(BASE_PRICES.sh_silver) },
    { id: 'sh_oil', symbol: 'INE.SC', name: 'Shanghai Crude', nameCN: '上海原油', category: 'energy', unit: 'CNY/bbl', price: BASE_PRICES.sh_oil, change: 0, changePercent: 0, history: generateHistory(BASE_PRICES.sh_oil) },
    { id: 'usd_cny', symbol: 'USDCNY', name: 'USD/CNY', nameCN: '美元/人民币', category: 'currency', unit: 'CNY', price: BASE_PRICES.usd_cny, change: 0, changePercent: 0, history: generateHistory(BASE_PRICES.usd_cny) },
    { id: 'btc', symbol: 'BTC/USD', name: 'Bitcoin', nameCN: '比特币', category: 'crypto', unit: 'USD', price: BASE_PRICES.btc, change: 0, changePercent: 0, history: generateHistory(BASE_PRICES.btc) },
    { id: 'nasdaq', symbol: 'IXIC', name: 'Nasdaq', nameCN: '纳斯达克', category: 'index', unit: 'Points', price: BASE_PRICES.nasdaq, change: 0, changePercent: 0, history: generateHistory(BASE_PRICES.nasdaq) },
    { id: 'gold_comex', symbol: 'GC=F', name: 'COMEX Gold', nameCN: 'COMEX黄金', category: 'metal', unit: 'USD/oz', price: 2750, change: 0, changePercent: 0, history: generateHistory(2750) },
    { id: 'silver_comex', symbol: 'SI=F', name: 'COMEX Silver', nameCN: 'COMEX白银', category: 'metal', unit: 'USD/oz', price: 34, change: 0, changePercent: 0, history: generateHistory(34) },
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
          return { ...def, price: cached.price, change: cached.change, changePercent: cached.changePercent, history: (cached.history && cached.history.length > 0) ? cached.history : def.history, sources: cached.sources };
        }
        return def;
      });
    }
  } catch (e) {}
  return ALL_POSSIBLE_ASSETS;
};

// --- SINA & DATA FETCHING ---
const SINA_CODES_MAP: Record<string, string> = {
  sh_composite: 'sh000001',
  sh_gold: 'nf_AU0',
  sh_silver: 'nf_AG0',
  sh_oil: 'nf_SC0',
  nasdaq: 'gb_ixic',
  usd_cny: 'fx_susdcny' // Attempt FX code
};

const fetchSinaData = async (): Promise<Record<string, number>> => {
  const codes = Object.values(SINA_CODES_MAP);
  const results: Record<string, number> = {};

  await Promise.all([
     // Domestic Futures & Stocks
     new Promise<void>(resolve => {
        const id = `sina_hq_main_${Date.now()}`;
        const script = document.createElement('script');
        script.src = `https://hq.sinajs.cn/list=${codes.join(',')}`;
        script.charset = 'gb2312';
        script.onload = () => {
            const win = window as any;
            codes.forEach(code => {
                const str = win[`hq_str_${code}`];
                if (!str) return;
                const parts = str.split(',');
                let p = 0;
                if (code.startsWith('nf_')) {
                    // Futures: Index 8 (New) or 0 (Close)
                    const v = parseFloat(parts[8] || parts[0]);
                    if (!isNaN(v) && v > 0) p = v;
                } else if (code.startsWith('sh')) {
                    const v = parseFloat(parts[3]);
                    if (!isNaN(v) && v > 0) p = v;
                } else if (code.startsWith('gb_')) {
                    const v = parseFloat(parts[1]);
                    if (!isNaN(v) && v > 0) p = v;
                }
                if (p > 0) results[code] = p;
            });
            script.remove();
            resolve();
        };
        script.onerror = () => { script.remove(); resolve(); };
        document.body.appendChild(script);
     })
  ]);
  return results;
};

export const fetchRealTimePrices = async (currentAssets: Asset[]): Promise<Asset[]> => {
  try {
    const sinaData = await fetchSinaData().catch(() => ({}));
    const finalPrices: Record<string, number> = {};
    const finalSources: Record<string, string[]> = {};
    const missingAssets: Asset[] = [];

    const setPrice = (id: string, price: number, source: string) => {
        finalPrices[id] = price;
        finalSources[id] = [source];
    };

    currentAssets.forEach(asset => {
        let found = false;
        const sinaCode = SINA_CODES_MAP[asset.id];
        
        // 1. Sina Data
        if (sinaCode && sinaData[sinaCode] && sinaData[sinaCode] > 0) {
            let p = sinaData[sinaCode];
            // Sina Silver returns kg price (e.g. 7150)
            if (asset.id === 'sh_silver' && p > 500) p = p / 1000;
            // Sina Gold returns g price (e.g. 625), no change needed
            
            setPrice(asset.id, p, 'Sina Finance');
            found = true;
        }

        if (!found) missingAssets.push(asset);
    });

    // 2. AI Fallback (Huilvbao)
    if (missingAssets.length > 0) {
        const aiPrices = await fetchLatestPricesViaAI(missingAssets);
        Object.entries(aiPrices).forEach(([id, price]) => {
            if (price > 0) {
                // Safety double check on unit
                let finalP = price;
                if (id === 'sh_silver' && finalP > 500) finalP = finalP / 1000;
                setPrice(id, finalP, 'AI (Huilvbao)');
            }
        });
    }

    // 3. Merge
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
    return currentAssets;
  }
};
