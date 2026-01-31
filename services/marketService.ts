import { Asset, PricePoint } from '../types';
import { fetchLatestPricesViaAI } from './geminiService';

const STORAGE_KEY = 'invest_pilot_prices_v4';

// Backup Base Prices (Used only if ALL APIs fail)
const BASE_PRICES: Record<string, number> = {
  sh_composite: 3260.50,
  sh_gold: 615.20,
  sh_silver: 7.65, // Converted to per gram (approx 7650 / 1000)
  sh_copper: 75500.00,
  sh_nickel: 128000.00,
  sh_oil: 580.50,
  usd_cny: 7.2550,
  btc: 67500.00,
  nasdaq: 19850.00,
  dow: 41200.00,
  us10y: 4.15,
};

// --- CACHE SYSTEM ---
const loadCache = (): Record<string, number> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
};

const saveCache = (newPrices: Record<string, number>) => {
  try {
    const current = loadCache();
    const updated = { ...current, ...newPrices };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // Ignore cache errors
  }
};

export const generateHistory = (basePrice: number, points = 24): PricePoint[] => {
  const history: PricePoint[] = [];
  let currentPrice = basePrice;
  const now = new Date();
  const volFactor = basePrice > 1000 ? 0.002 : 0.005;
  
  for (let i = points; i > 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const change = (Math.random() - 0.5) * (basePrice * volFactor);
    currentPrice += change;
    
    // Ensure precision is kept, do not round to integer even for large numbers
    let formattedValue = parseFloat(currentPrice.toFixed(4));
    
    history.push({
      time: `${time.getHours()}:00`,
      value: formattedValue
    });
  }
  return history;
};

// New function to support dynamic timeframes in Detail View
export const getHistoryForTimeframe = (basePrice: number, timeframe: string): PricePoint[] => {
  const now = new Date();
  let points = 30;
  let interval = 24 * 60 * 60 * 1000;
  let formatTime = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
  let volatilityFactor = 0.08;

  switch (timeframe) {
    case '1H':
      points = 60;
      interval = 60 * 1000; 
      formatTime = (date: Date) => `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      volatilityFactor = 0.005;
      break;
    case '1D':
      points = 24;
      interval = 60 * 60 * 1000;
      formatTime = (date: Date) => `${date.getHours()}:00`;
      volatilityFactor = 0.02;
      break;
    case '1W':
      points = 7;
      interval = 24 * 60 * 60 * 1000;
      formatTime = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
      volatilityFactor = 0.03;
      break;
    case '1M':
      points = 30;
      interval = 24 * 60 * 60 * 1000;
      formatTime = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
      volatilityFactor = 0.08;
      break;
    case '1Y':
      points = 12;
      interval = 30 * 24 * 60 * 60 * 1000;
      formatTime = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}`;
      volatilityFactor = 0.20;
      break;
  }

  const history: PricePoint[] = [];
  let tempPrice = basePrice;
  
  // Last point is current
  // Use toFixed(4) to ensure decimals are preserved for all asset types
  history.unshift({
      time: formatTime(now),
      value: Number(basePrice.toFixed(4))
  });

  for (let i = 1; i < points; i++) {
    const time = new Date(now.getTime() - i * interval);
    const change = (Math.random() - 0.5) * (basePrice * volatilityFactor * (2.5 / Math.sqrt(points)));
    tempPrice -= change;
    
    if (tempPrice < 0) tempPrice = 0.01;

    history.unshift({
      time: formatTime(time),
      value: Number(tempPrice.toFixed(4))
    });
  }
  
  return history;
};

export const getInitialAssets = (): Asset[] => {
  return [
    {
      id: 'sh_composite',
      symbol: '000001.SS',
      name: 'SSE Composite',
      nameCN: '上证指数',
      category: 'index',
      unit: 'Points',
      price: BASE_PRICES.sh_composite,
      change: 0,
      changePercent: 0,
      history: generateHistory(BASE_PRICES.sh_composite),
    },
    {
      id: 'sh_gold',
      symbol: 'SHFE.AU',
      name: 'Shanghai Gold',
      nameCN: '上海黄金',
      category: 'metal',
      unit: 'CNY/g',
      price: BASE_PRICES.sh_gold,
      change: 0,
      changePercent: 0,
      history: generateHistory(BASE_PRICES.sh_gold),
    },
    {
      id: 'sh_silver',
      symbol: 'SHFE.AG',
      name: 'Shanghai Silver',
      nameCN: '上海白银',
      category: 'metal',
      unit: 'CNY/g', // Changed unit to CNY/g
      price: BASE_PRICES.sh_silver,
      change: 0,
      changePercent: 0,
      history: generateHistory(BASE_PRICES.sh_silver),
    },
    {
      id: 'sh_copper',
      symbol: 'SHFE.CU',
      name: 'Shanghai Copper',
      nameCN: '上海紫铜',
      category: 'metal',
      unit: 'CNY/ton',
      price: BASE_PRICES.sh_copper,
      change: 0,
      changePercent: 0,
      history: generateHistory(BASE_PRICES.sh_copper),
    },
    {
      id: 'sh_nickel',
      symbol: 'SHFE.NI',
      name: 'Shanghai Nickel',
      nameCN: '上海镍',
      category: 'metal',
      unit: 'CNY/ton',
      price: BASE_PRICES.sh_nickel,
      change: 0,
      changePercent: 0,
      history: generateHistory(BASE_PRICES.sh_nickel),
    },
    {
      id: 'sh_oil',
      symbol: 'INE.SC',
      name: 'Shanghai Crude',
      nameCN: '上海原油',
      category: 'energy',
      unit: 'CNY/barrel',
      price: BASE_PRICES.sh_oil,
      change: 0,
      changePercent: 0,
      history: generateHistory(BASE_PRICES.sh_oil),
    },
    {
      id: 'usd_cny',
      symbol: 'USDCNY',
      name: 'USD/CNY',
      nameCN: '美元/人民币',
      category: 'currency',
      unit: 'CNY',
      price: BASE_PRICES.usd_cny,
      change: 0,
      changePercent: 0,
      history: generateHistory(BASE_PRICES.usd_cny),
    },
    {
      id: 'btc',
      symbol: 'BTC/USD',
      name: 'Bitcoin',
      nameCN: '比特币',
      category: 'crypto',
      unit: 'USD',
      price: BASE_PRICES.btc,
      change: 0,
      changePercent: 0,
      history: generateHistory(BASE_PRICES.btc),
    },
    {
      id: 'nasdaq',
      symbol: 'IXIC',
      name: 'Nasdaq',
      nameCN: '纳斯达克',
      category: 'index',
      unit: 'Points',
      price: BASE_PRICES.nasdaq,
      change: 0,
      changePercent: 0,
      history: generateHistory(BASE_PRICES.nasdaq),
    },
    {
      id: 'dow',
      symbol: 'DJI',
      name: 'Dow Jones',
      nameCN: '道琼斯',
      category: 'index',
      unit: 'Points',
      price: BASE_PRICES.dow,
      change: 0,
      changePercent: 0,
      history: generateHistory(BASE_PRICES.dow),
    },
    {
      id: 'us10y',
      symbol: 'US10Y',
      name: 'US 10Y Yield',
      nameCN: '美债10年',
      category: 'bond',
      unit: '%',
      price: BASE_PRICES.us10y,
      change: 0,
      changePercent: 0,
      history: generateHistory(BASE_PRICES.us10y),
    },
  ];
};

export const updateAssetPrice = (asset: Asset): Asset => {
  if (!asset.history || asset.history.length === 0) return asset;

  // Pure visual tick (micro-movements)
  // Ensure price is a number to avoid NaN
  const safePrice = typeof asset.price === 'number' && !isNaN(asset.price) ? asset.price : (BASE_PRICES[asset.id] || 0);
  const volatility = safePrice * 0.00005; 
  const change = (Math.random() - 0.5) * volatility;
  const newPrice = safePrice + change;
  
  const openPrice = asset.history[0].value || newPrice;
  const priceChange = newPrice - openPrice;
  const percentChange = openPrice !== 0 ? (priceChange / openPrice) * 100 : 0;

  // Use toFixed(4) to display all significant decimals
  return {
    ...asset,
    price: parseFloat(newPrice.toFixed(4)),
    change: parseFloat(priceChange.toFixed(4)),
    changePercent: parseFloat(percentChange.toFixed(4)),
  };
};

// --- SOURCE 1: SINA FINANCE (JSONP) ---
const SINA_CODES = {
  sh_composite: 'sh000001',
  sh_gold: 'nf_AU0',
  sh_silver: 'nf_AG0',
  sh_copper: 'nf_CU0',
  sh_nickel: 'nf_NI0',
  sh_oil: 'nf_SC0',
  nasdaq: 'gb_ixic',
  dow: 'gb_dji',
};

const fetchSinaData = async (): Promise<Record<string, number>> => {
  const codes = Object.values(SINA_CODES).join(',');
  const scriptId = `sina_hq_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  return new Promise((resolve) => {
    let completed = false;
    const cleanup = () => {
      if (completed) return;
      completed = true;
      try {
        const s = document.getElementById(scriptId);
        if (s) s.remove();
        // Do NOT delete window properties here as other concurrent requests might need them
        // or just let them stay as they are small strings.
      } catch(e) {}
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve({});
    }, 2500); 

    try {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://hq.sinajs.cn/list=${codes}`;
      script.charset = 'gb2312';
      
      script.onload = () => {
        clearTimeout(timer);
        try {
          const results: Record<string, number> = {};
          const win = window as any;

          if (win.hq_str_sh000001) {
            const parts = win.hq_str_sh000001.split(',');
            if (parts.length > 3) results.sh_composite = parseFloat(parts[3]);
          }

          const parseFutures = (code: string, key: string) => {
            const varName = `hq_str_${code}`;
            const str = win[varName];
            if (str && typeof str === 'string') {
              const parts = str.split(',');
              const price = parts.length > 8 ? parseFloat(parts[8]) : 0; 
              if (!isNaN(price) && price > 0) results[key] = price;
            }
          };
          parseFutures('nf_AU0', 'sh_gold');
          parseFutures('nf_AG0', 'sh_silver');
          parseFutures('nf_CU0', 'sh_copper');
          parseFutures('nf_NI0', 'sh_nickel');
          parseFutures('nf_SC0', 'sh_oil');

          const parseUS = (code: string, key: string) => {
            const varName = `hq_str_${code}`;
            const str = win[varName];
            if (str && typeof str === 'string') {
              const parts = str.split(',');
              const price = parts.length > 1 ? parseFloat(parts[1]) : 0;
              if (!isNaN(price) && price > 0) results[key] = price;
            }
          };
          parseUS('gb_ixic', 'nasdaq');
          parseUS('gb_dji', 'dow');

          cleanup();
          resolve(results);
        } catch (err) {
          cleanup();
          resolve({});
        }
      };
      
      script.onerror = () => {
        clearTimeout(timer);
        cleanup();
        resolve({});
      };
      
      document.body.appendChild(script);
    } catch (e) {
      clearTimeout(timer);
      cleanup();
      resolve({});
    }
  });
};

// --- SOURCE 2: TENCENT FINANCE (JSONP) ---
const TENCENT_CODES = {
  sh_composite: 'sh000001',
  nasdaq: 'us.IXIC',
  dow: 'us.DJI',
};

const fetchTencentData = async (): Promise<Record<string, number>> => {
  const codes = Object.values(TENCENT_CODES).join(',');
  const scriptId = `tencent_hq_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  return new Promise((resolve) => {
    let completed = false;
    const cleanup = () => {
        if (completed) return;
        completed = true;
        try {
          const s = document.getElementById(scriptId);
          if (s) s.remove();
        } catch(e) {}
    };

    const timer = setTimeout(() => {
        cleanup();
        resolve({});
    }, 2500);

    try {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://qt.gtimg.cn/q=${codes}`;
      script.charset = 'gb2312';

      script.onload = () => {
        clearTimeout(timer);
        try {
          const results: Record<string, number> = {};
          const win = window as any;

          const parseTencent = (varName: string, key: string) => {
            let safeVarName = 'v_' + varName.replace('.', '_');
            const str = win[safeVarName];
            if (str && typeof str === 'string') {
              const parts = str.split('~');
              const price = parts.length > 3 ? parseFloat(parts[3]) : 0;
              if (!isNaN(price) && price > 0) results[key] = price;
            }
          };

          parseTencent('sh000001', 'sh_composite');
          parseTencent('us.IXIC', 'nasdaq');
          parseTencent('us.DJI', 'dow');

          cleanup();
          resolve(results);
        } catch (err) {
          cleanup();
          resolve({});
        }
      };
      
      script.onerror = () => {
        clearTimeout(timer);
        cleanup();
        resolve({});
      };
      
      document.body.appendChild(script);
    } catch (e) {
      clearTimeout(timer);
      cleanup();
      resolve({});
    }
  });
};

// --- SOURCE 3 & 4: API FETCHERS ---

const fetchForexRate = async (): Promise<number> => {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        method: 'GET',
        credentials: 'omit',
    }).catch(() => null);
    if (!res || !res.ok) return 0;
    const data = await res.json();
    return data.rates?.CNY || BASE_PRICES.usd_cny;
  } catch (e) { return 0; }
};

const fetchCryptoData = async (): Promise<Record<string, number>> => {
  try {
    const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,pax-gold&vs_currencies=usd', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    }).then(r => r.json()).catch(() => null);
    
    const map: Record<string, number> = {};

    if (cgRes) {
      if (cgRes.bitcoin?.usd) map['btc'] = cgRes.bitcoin.usd;
      if (cgRes['pax-gold']?.usd) map['paxg'] = cgRes['pax-gold'].usd;
    }
    
    return map;
  } catch (e) { 
    return {}; 
  }
};

// --- MAIN FETCH ORCHESTRATOR ---

export const fetchRealTimePrices = async (currentAssets: Asset[]): Promise<Asset[]> => {
  const cachedPrices = loadCache();
  
  // Wrap all in a big try-catch to prevent crash
  try {
    const [sina, tencent, cnyRate, cryptoData] = await Promise.all([
      fetchSinaData().catch(() => ({})),
      fetchTencentData().catch(() => ({})),
      fetchForexRate().catch(() => 0),
      fetchCryptoData().catch(() => ({}))
    ]);

    let finalPrices: Record<string, number> = {};
    const validCny = cnyRate || BASE_PRICES.usd_cny;
    const missingAssets: Asset[] = [];

    // Phase 1: Try Standard APIs
    currentAssets.forEach(asset => {
      let newPrice = 0;
      let found = false;

      // Logic: Composite Indices
      if (['sh_composite', 'nasdaq', 'dow'].includes(asset.id)) {
          const valSina = sina[asset.id];
          const valTencent = tencent[asset.id];

          if (valSina && valTencent) {
              const diff = Math.abs(valSina - valTencent) / valSina;
              if (diff < 0.01) {
                  newPrice = (valSina + valTencent) / 2; 
                  found = true;
              } else {
                  newPrice = valSina;
                  found = true;
              }
          } else if (valSina) {
              newPrice = valSina;
              found = true;
          } else if (valTencent) {
              newPrice = valTencent;
              found = true;
          }
      }

      // Logic: Commodities
      else if (['sh_gold', 'sh_silver', 'sh_copper', 'sh_nickel', 'sh_oil'].includes(asset.id)) {
          if (sina[asset.id]) {
              newPrice = sina[asset.id];
              // SPECIAL: Convert Silver from kg to g if the price implies kg (e.g. > 500)
              if (asset.id === 'sh_silver' && newPrice > 500) {
                  newPrice = newPrice / 1000;
              }
              found = true;
          } 
          
          if (asset.id === 'sh_gold' && !found) {
              const goldUSD = cryptoData['paxg'];
              if (goldUSD) {
                  newPrice = (goldUSD * validCny) / 31.1035;
                  found = true;
              }
          }
      }

      // Logic: Crypto
      else if (asset.id === 'btc') {
          if (cryptoData['btc']) {
              newPrice = cryptoData['btc'];
              found = true;
          }
      }

      // Logic: Forex
      else if (asset.id === 'usd_cny') {
          if (cnyRate) {
              newPrice = cnyRate;
              found = true;
          }
      }

      if (found) {
        finalPrices[asset.id] = newPrice;
      } else {
        // Mark for AI Search if not simulating us10y
        if (asset.id !== 'us10y') {
           missingAssets.push(asset);
        }
      }
    });

    // Phase 2: AI Fallback (Gemini Search) for missing assets
    let aiPrices: Record<string, number> = {};
    if (missingAssets.length > 0) {
       aiPrices = await fetchLatestPricesViaAI(missingAssets);
    }

    // Phase 3: Construct Final Assets
    const updatedAssets = currentAssets.map(asset => {
      let newPrice = asset.price;
      let sources: string[] = [];

      // Check Standard APIs result
      if (finalPrices[asset.id]) {
        newPrice = finalPrices[asset.id];
        sources = ['API'];
        if (['sh_composite'].includes(asset.id) && sina[asset.id] && tencent[asset.id]) {
            sources = ['Sina', 'Tencent'];
        } else if (asset.id === 'btc') {
            sources = ['CoinGecko'];
        } else if (asset.id.startsWith('sh_') && sina[asset.id]) {
            sources = ['Sina'];
        }
      } 
      // Check AI Search result
      else if (aiPrices[asset.id]) {
        newPrice = aiPrices[asset.id];
        // SPECIAL: Convert Silver AI result if needed
        if (asset.id === 'sh_silver' && newPrice > 500) {
            newPrice = newPrice / 1000;
        }
        sources = ['AI Search']; // Gemini with Google Grounding
      }
      // Check Cache
      else if (cachedPrices[asset.id]) {
        newPrice = cachedPrices[asset.id];
        sources = ['Cache'];
      }
      // Fallback
      else {
        newPrice = BASE_PRICES[asset.id] || asset.price;
        sources = ['Base'];
      }

      // Special: US10Y (Simulation)
      if (asset.id === 'us10y') {
        newPrice = BASE_PRICES.us10y + ((Math.random() - 0.5) * 0.05);
        sources = ['Simulated'];
      }

      // Safety check for NaN
      if (typeof newPrice !== 'number' || isNaN(newPrice) || newPrice <= 0) {
          newPrice = BASE_PRICES[asset.id] || 0;
      }

      // Store for next cache save
      finalPrices[asset.id] = newPrice;

      const safeCurrentPrice = (typeof asset.price === 'number' && !isNaN(asset.price)) ? asset.price : newPrice;
      const priceDiff = newPrice - safeCurrentPrice;
      
      const newHistory = asset.history.map(p => ({ 
        ...p, 
        value: p.value + priceDiff 
      }));
      
      const open = newHistory[0]?.value || newPrice;
      const changeVal = newPrice - open;
      const changePct = open !== 0 ? (changeVal / open) * 100 : 0;

      return {
        ...asset,
        price: parseFloat(newPrice.toFixed(4)), // Ensure 4 decimals
        change: parseFloat(changeVal.toFixed(4)), // Ensure 4 decimals
        changePercent: parseFloat(changePct.toFixed(4)), // Ensure 4 decimals
        history: newHistory,
        lastChecked: 'Now',
        sources: sources
      };
    });

    saveCache(finalPrices);
    return updatedAssets;
  } catch (e) {
    console.warn("Global Fetch Error", e);
    return currentAssets;
  }
};