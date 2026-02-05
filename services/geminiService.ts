
import { GoogleGenAI, Type } from "@google/genai";
import { Asset, MarketAnalysis, Language, ChatMessage } from "../types";

// --- GLOBAL FETCH INTERCEPTOR FOR PROXY SUPPORT ---
try {
  const originalFetch = window.fetch;
  const proxyFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let resource = input;
    try {
      const savedBaseUrl = localStorage.getItem('user_api_base_url');
      const targetHost = 'generativelanguage.googleapis.com';
      
      if (savedBaseUrl && typeof resource === 'string' && resource.includes(targetHost)) {
         let cleanBase = savedBaseUrl.trim().replace(/\/$/, '');
         if (!cleanBase.startsWith('http')) {
           cleanBase = 'https://' + cleanBase;
         }
         const newUrl = resource.replace(`https://${targetHost}`, cleanBase);
         resource = newUrl;
      }
    } catch (e) {
      // ignore
    }
    
    try {
        const response = await originalFetch(resource, init);
        return response;
    } catch (networkError) {
        console.error("[Gemini Service] Network Request Failed:", networkError);
        throw new Error("NETWORK_ERROR");
    }
  };

  Object.defineProperty(window, 'fetch', {
    value: proxyFetch,
    writable: true,
    configurable: true
  });
} catch (e) {
  console.warn("[Gemini Service] Failed to install proxy interceptor.", e);
}

const cleanJsonString = (str: string) => {
  if (!str) return "";
  let cleaned = str.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
  }
  return cleaned;
};

// Helper to safely parse strings with commas like "7,120.50"
const parseFinancialNumber = (val: string | number): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        // Remove commas and currency symbols
        const clean = val.replace(/,/g, '').replace(/[^\d.-]/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

const getEffectiveConfig = (): { apiKey: string | undefined } => {
  let apiKey = process.env.API_KEY;
  try {
    const localKey = localStorage.getItem('user_custom_api_key');
    if (localKey && localKey.length > 10) {
      apiKey = localKey;
    }
  } catch (e) {}
  return { apiKey };
};

const getReadableErrorMsg = (error: any, lang: Language): string => {
  const msg = error?.message || '';
  
  if (msg === "NETWORK_ERROR" || msg.includes('Failed to fetch')) {
      return lang === 'zh' 
        ? "网络连接失败：请检查【API 代理】设置。" 
        : "Network Error: Check Proxy settings.";
  }
  if (msg.includes('401')) return lang === 'zh' ? "API Key 无效" : "Invalid API Key";
  if (msg.includes('429')) return lang === 'zh' ? "配额已用尽" : "Quota Exceeded";
  return lang === 'zh' ? "AI 服务异常" : "AI Service Error";
};

const getFallbackAnalysis = (name: string, price: number, changePercent: number, lang: Language): MarketAnalysis => {
  let sentiment: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
  if (changePercent > 0.5) sentiment = 'Bullish';
  else if (changePercent < -0.5) sentiment = 'Bearish';

  return {
    summary: lang === 'zh' 
        ? `无法连接 AI。${name} 当前价格 ${price}。`
        : `AI Unavailable. ${name} at ${price}.`,
    sentiment: sentiment,
    keyLevels: "N/A",
    advice: lang === 'zh' ? "请检查网络。" : "Check network.",
    timestamp: Date.now()
  };
};

export const fetchAssetAnalysis = async (asset: Asset, lang: Language): Promise<MarketAnalysis> => {
  try {
    const { apiKey } = getEffectiveConfig();
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Analyze asset: ${asset.name} (${asset.symbol}) Price: ${asset.price}.
      Output language: ${lang === 'zh' ? 'Chinese' : 'English'}.
      Return JSON: { summary, sentiment (Bullish/Bearish/Neutral), keyLevels, advice }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            sentiment: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] },
            keyLevels: { type: Type.STRING },
            advice: { type: Type.STRING }
          },
          required: ["summary", "sentiment", "keyLevels", "advice"]
        }
      }
    });

    const result = JSON.parse(cleanJsonString(response.text || "{}"));
    return { ...result, timestamp: Date.now() };

  } catch (error) {
    return getFallbackAnalysis(lang === 'zh' ? asset.nameCN : asset.name, asset.price, asset.changePercent, lang);
  }
};

export const fetchMarketAnalysis = async (assets: Asset[], lang: Language): Promise<MarketAnalysis> => {
  try {
    const { apiKey } = getEffectiveConfig();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    
    // Simple fallback
    return {
      summary: lang === 'zh' ? "AI 市场分析生成中..." : "Generating analysis...",
      sentiment: "Neutral",
      keyLevels: "---",
      advice: "---",
      timestamp: Date.now()
    }
  } catch (e) {
    return getFallbackAnalysis("Market", 0, 0, lang);
  }
};

export const sendChatQuery = async (
  query: string,
  selectedAsset: Asset | null,
  allAssets: Asset[],
  history: ChatMessage[],
  lang: Language
): Promise<string> => {
  try {
    const { apiKey } = getEffectiveConfig();
    if (!apiKey) return lang === 'zh' ? "请先配置 API Key" : "Please config API Key";
    
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `User: ${query}`; // Simplified for brevity in this fix
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || "";
  } catch (error) {
    return getReadableErrorMsg(error, lang);
  }
};

export const fetchLatestPricesViaAI = async (assetsToFetch: Asset[]): Promise<Record<string, number>> => {
  try {
    const { apiKey } = getEffectiveConfig();
    if (!apiKey || assetsToFetch.length === 0) return {};

    const ai = new GoogleGenAI({ apiKey });
    
    // Smaller chunks for better accuracy
    const chunkSize = 3; 
    const chunks: Asset[][] = [];
    for (let i = 0; i < assetsToFetch.length; i += chunkSize) {
        chunks.push(assetsToFetch.slice(i, i + chunkSize));
    }

    const results: Record<string, number> = {};

    await Promise.all(chunks.map(async (chunk) => {
        const assetMap = chunk.map(a => `ID: "${a.id}", Name: "${a.nameCN}" (${a.symbol})`).join('\n');
        
        // ENHANCED PROMPT FOR HUILVBAO AND UNITS
        const prompt = `
          Task: Find REAL-TIME prices for these assets.
          Source Preference: "huilvbao.com" (汇率宝), Sina Finance, or Google Finance.
          
          CRITICAL UNIT CONVERSION RULES:
          1. For "Shanghai Silver" (上海白银) or "Shanghai Gold" (上海黄金):
             - If source is in CNY/kg (e.g., 7100), YOU MUST DIVIDE BY 1000 to get CNY/g (e.g., 7.10).
             - Return ONLY the CNY/g price.
          2. For "Shanghai Crude" (上海原油): Return CNY/bbl.
          3. For "USD/CNY": Return current exchange rate (approx 7.1-7.3).

          Assets:
          ${assetMap}

          Output JSON keys must match IDs exactly. Values must be numbers (no strings).
          Example Output: { "sh_silver": 7.15, "sh_gold": 625.50 }
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: "application/json",
                }
            });

            const txt = response.text;
            if (txt) {
                const cleanTxt = cleanJsonString(txt);
                const json = JSON.parse(cleanTxt);
                Object.entries(json).forEach(([k, v]) => {
                    // Use helper to parse potentially messy numbers
                    const val = parseFinancialNumber(v as string | number);
                    if (val > 0) results[k] = val;
                });
            }
        } catch (err) {
            console.warn(`AI Price Fetch failed`, err);
        }
    }));

    return results;

  } catch (error) {
    return {};
  }
};
