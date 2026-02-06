
import { GoogleGenAI, Type } from "@google/genai";
import { Asset, MarketAnalysis, Language, ChatMessage } from "../types";

// --- GLOBAL FETCH INTERCEPTOR FOR PROXY SUPPORT ---
try {
  const originalFetch = window.fetch;
  const proxyFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let resource = input;
    const targetHost = 'generativelanguage.googleapis.com';

    try {
      // 1. Check for Docker/Build-time configured Proxy (Priority)
      // @ts-ignore
      const buildTimeProxy = import.meta.env.VITE_API_BASE_URL; 
      
      // 2. Check for User configured Proxy (Settings)
      const savedBaseUrl = localStorage.getItem('user_api_base_url');

      if (typeof resource === 'string' && resource.includes(targetHost)) {
         let newBase = '';

         if (buildTimeProxy && buildTimeProxy.startsWith('/')) {
             // If build-time proxy is a relative path (e.g., /api/proxy), use it directly
             // This maps https://generativelanguage.googleapis.com/v1beta/... -> /api/proxy/v1beta/...
             newBase = buildTimeProxy;
             // Remove the protocol and host from the resource, keep the path
             const urlObj = new URL(resource);
             resource = `${newBase}${urlObj.pathname}${urlObj.search}`;
         } 
         else if (savedBaseUrl) {
             // User custom full URL proxy
             let cleanBase = savedBaseUrl.trim().replace(/\/$/, '');
             if (!cleanBase.startsWith('http')) {
               cleanBase = 'https://' + cleanBase;
             }
             resource = resource.replace(`https://${targetHost}`, cleanBase);
         }
      }
    } catch (e) {
      // ignore parsing errors
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
  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "");
  return cleaned.trim();
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
      Current System Date: ${new Date().toLocaleDateString()}.
      Return JSON: { summary, sentiment (Bullish/Bearish/Neutral), keyLevels, advice }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable search for analysis too
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
    
    // Simple fallback logic since full market analysis is heavy
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
    const currentDate = new Date().toLocaleString();
    
    // Construct context from asset list
    const assetContext = allAssets.map(a => `${a.nameCN} (${a.price} ${a.unit})`).join(', ');

    const systemContext = `
      You are an Investment AI Assistant.
      Current System Time: ${currentDate}.
      If the user asks for the date, use the Google Search tool or the system time provided above.
      
      Live Prices Context: ${assetContext}.
      
      You MUST use the "googleSearch" tool if the user asks for:
      1. Real-time news.
      2. Dates, times, or "today".
      3. Prices of assets not in the list.
    `;

    const prompt = `${systemContext}\n\nUser Query: ${query}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }] // CRITICAL: ENABLE TOOLS FOR CHAT
      }
    });

    // Check for grounding metadata (source links)
    const grounding = response.candidates?.[0]?.groundingMetadata;
    let text = response.text || "";

    // Append sources if available
    if (grounding?.groundingChunks) {
       const links = grounding.groundingChunks
        .map((c: any) => c.web?.uri)
        .filter((u: any) => !!u);
       
       if (links.length > 0) {
           const uniqueLinks = [...new Set(links)].slice(0, 3);
           const sourceLabel = lang === 'zh' ? '\n\n参考来源:' : '\n\nSources:';
           text += `${sourceLabel}\n${uniqueLinks.map((l: any) => `- ${l}`).join('\n')}`;
       }
    }

    return text;
  } catch (error) {
    return getReadableErrorMsg(error, lang);
  }
};

export const fetchLatestPricesViaAI = async (assetsToFetch: Asset[]): Promise<Record<string, number>> => {
  try {
    const { apiKey } = getEffectiveConfig();
    if (!apiKey || assetsToFetch.length === 0) return {};

    const ai = new GoogleGenAI({ apiKey });
    const currentDate = new Date().toLocaleString();
    
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
          Current Date/Time: ${currentDate}.
          Task: USE GOOGLE SEARCH to find REAL-TIME prices for these assets.
          Do NOT use internal knowledge. Search for "latest price [Asset Name]".
          
          Sources Preference: "huilvbao.com", "sina finance", "google finance".

          CRITICAL UNIT CONVERSION:
          1. "Shanghai Silver" (上海白银): If price > 5000 (CNY/kg), DIVIDE BY 1000. Output CNY/g.
          2. "Shanghai Gold" (上海黄金): Output CNY/g.
          3. "Shanghai Crude" (上海原油): Output CNY/bbl.

          Assets:
          ${assetMap}

          Output JSON keys must match IDs exactly. Values must be numbers.
          Example: { "sh_silver": 7.15, "sh_gold": 625.50 }
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
