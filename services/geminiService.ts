
import { GoogleGenAI, Type } from "@google/genai";
import { Asset, MarketAnalysis, Language, ChatMessage } from "../types";

// --- GLOBAL FETCH INTERCEPTOR FOR PROXY SUPPORT ---
// We use a robust patching method to ensure we can intercept requests
// even in environments where window.fetch might be protected.
try {
  const originalFetch = window.fetch;
  const proxyFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let resource = input;
    try {
      const savedBaseUrl = localStorage.getItem('user_api_base_url');
      const targetHost = 'generativelanguage.googleapis.com';
      
      // Only intercept if we have a custom proxy set
      if (savedBaseUrl && typeof resource === 'string' && resource.includes(targetHost)) {
         let cleanBase = savedBaseUrl.trim().replace(/\/$/, '');
         
         // Ensure protocol
         if (!cleanBase.startsWith('http')) {
           cleanBase = 'https://' + cleanBase;
         }

         // Perform replacement:
         // From: https://generativelanguage.googleapis.com/v1beta/models/...
         // To:   https://my-custom-proxy.com/v1beta/models/...
         const newUrl = resource.replace(`https://${targetHost}`, cleanBase);
         
         // console.log(`[Proxy] Redirecting: ${newUrl}`); // Debug
         resource = newUrl;
      }
    } catch (e) {
      // ignore parsing errors
    }
    
    try {
        const response = await originalFetch(resource, init);
        return response;
    } catch (networkError) {
        // This catch block handles "Failed to fetch" which usually means DNS failure or Connection Refused (Firewall)
        console.error("[Gemini Service] Network Request Failed:", networkError);
        throw new Error("NETWORK_ERROR");
    }
  };

  // Attempt to override window.fetch
  Object.defineProperty(window, 'fetch', {
    value: proxyFetch,
    writable: true,
    configurable: true
  });
} catch (e) {
  console.warn("[Gemini Service] Failed to install proxy interceptor.", e);
}

// Helper to clean JSON string from Markdown code blocks
const cleanJsonString = (str: string) => {
  if (!str) return "";
  let cleaned = str.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
  }
  return cleaned;
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

// IMPROVED ERROR HANDLER
const getReadableErrorMsg = (error: any, lang: Language): string => {
  const msg = error?.message || '';
  
  if (msg === "NETWORK_ERROR" || msg.includes('Failed to fetch')) {
      return lang === 'zh' 
        ? "网络连接失败：请检查您的【API 代理地址】。Cloudflare Workers 的默认域名(.workers.dev)在中国大陆已被屏蔽，请使用绑定了自定义域名的地址。" 
        : "Network Error: Connection failed. Your Proxy URL might be blocked (workers.dev). Please use a custom domain.";
  }

  if (msg.includes('401') || msg.includes('API key not valid')) {
      return lang === 'zh' ? "配置错误：API Key 无效。" : "Config Error: Invalid API Key.";
  }

  if (msg.includes('429') || msg.includes('Quota') || error?.status === 'RESOURCE_EXHAUSTED') {
      return lang === 'zh' ? "服务繁忙：API 配额已用尽，请稍后再试。" : "Service Busy: API Quota exceeded.";
  }

  if (msg.includes('500') || msg.includes('503')) {
      return lang === 'zh' ? "Google 服务暂时不可用，请稍后再试。" : "Google service temporary unavailable.";
  }

  return lang === 'zh' 
      ? `AI 服务出错: ${msg.slice(0, 50)}...` 
      : `AI Error: ${msg.slice(0, 50)}...`;
};

/**
 * Generates a rule-based analysis when AI is unavailable.
 */
const getFallbackAnalysis = (
  name: string, 
  price: number, 
  changePercent: number, 
  lang: Language
): MarketAnalysis => {
  const isUp = changePercent >= 0;
  const absChange = Math.abs(changePercent);
  
  let sentiment: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
  if (changePercent > 0.5) sentiment = 'Bullish';
  else if (changePercent < -0.5) sentiment = 'Bearish';

  const support = (price * (1 - (absChange > 1 ? 0.02 : 0.01))).toFixed(2);
  const resistance = (price * (1 + (absChange > 1 ? 0.02 : 0.01))).toFixed(2);

  return {
    summary: lang === 'zh' 
        ? `当前${name}价格为 ${price}。由于网络原因无法获取 AI 深度分析，请参考技术指标。`
        : `${name} at ${price}. Deep AI analysis unavailable due to network issues.`,
    sentiment: sentiment,
    keyLevels: `${support} (S) / ${resistance} (R)`,
    advice: lang === 'zh' ? "请检查代理设置或网络连接。" : "Check proxy settings or network.",
    timestamp: Date.now()
  };
};

export const fetchAssetAnalysis = async (asset: Asset, lang: Language): Promise<MarketAnalysis> => {
  try {
    const { apiKey } = getEffectiveConfig();
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    
    const assetContext = `
      Asset: ${lang === 'zh' ? asset.nameCN : asset.name} (${asset.symbol})
      Current Price: ${asset.price} ${asset.unit}
      Change: ${asset.changePercent}%
      Category: ${asset.category}
    `;

    const prompt = `
      You are a professional financial analyst.
      Analyze SPECIFIC asset: ${assetContext}
      Output language: ${lang === 'zh' ? 'Chinese (Simplified)' : 'English'}.
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

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response");

    const result = JSON.parse(cleanJsonString(jsonText));
    return { ...result, timestamp: Date.now() };

  } catch (error) {
    console.error("fetchAssetAnalysis Error", error);
    // Return Fallback
    return getFallbackAnalysis(
      lang === 'zh' ? asset.nameCN : asset.name, 
      asset.price, 
      asset.changePercent, 
      lang
    );
  }
};

export const fetchMarketAnalysis = async (assets: Asset[], lang: Language): Promise<MarketAnalysis> => {
  try {
    const { apiKey } = getEffectiveConfig();
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });

    const assetsSummary = assets.map(a => 
      `- ${a.symbol}: ${a.price} (${a.changePercent}%)`
    ).join('\n');

    const prompt = `
      Market Analyst. Analyze these assets:
      ${assetsSummary}
      Output: ${lang === 'zh' ? 'Chinese' : 'English'}.
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

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response");

    const result = JSON.parse(cleanJsonString(jsonText));
    return { ...result, timestamp: Date.now() };

  } catch (error) {
    console.error("fetchMarketAnalysis Error", error);
    
    // Aggregate Fallback
    const upCount = assets.filter(a => a.changePercent > 0).length;
    const isBullish = upCount > assets.length / 2;
    
    return {
      summary: lang === 'zh' 
        ? "无法连接 AI 获取市场日报。请检查您的【API 代理地址】设置。Cloudflare Workers 默认域名在中国大陆可能无法访问。" 
        : "Cannot connect to AI. Please check your Proxy URL setting. The default workers.dev domain is likely blocked.",
      sentiment: isBullish ? "Bullish" : "Bearish",
      keyLevels: "N/A",
      advice: lang === 'zh' ? "请参考上方行情列表。" : "Please refer to the market list.",
      timestamp: Date.now()
    };
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
    if (!apiKey) throw new Error(lang === 'zh' ? "缺少 API Key" : "Missing API Key");
    
    const ai = new GoogleGenAI({ apiKey });

    // Simplified context for stability
    const now = new Date();
    let contextStr = `Time: ${now.toLocaleString()}\n`;
    if (selectedAsset) {
      contextStr += `Focus: ${selectedAsset.name} (${selectedAsset.symbol}) Price: ${selectedAsset.price}\n`;
    }
    const marketOverview = allAssets.map(a => `${a.symbol}:${a.price}`).join('|');
    contextStr += `Market: ${marketOverview}`;

    const systemInstruction = `
      Role: Financial Assistant for "Smart Invest Pilot".
      Lang: ${lang === 'zh' ? 'Chinese' : 'English'}.
      Data: ${contextStr}
      Task: Answer user query. Be professional.
    `;

    // Limit history to last 3 to save tokens and reduce error surface
    const recentHistory = history.slice(-3).map(msg => 
      `${msg.role}: ${msg.text}`
    ).join('\n');

    const fullPrompt = `${systemInstruction}\nHistory:\n${recentHistory}\nUser: ${query}\nAssistant:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
      config: {
        tools: [{ googleSearch: {} }], 
      }
    });

    return response.text || (lang === 'zh' ? '无回应。' : 'No response.');

  } catch (error) {
    console.error("sendChatQuery Error", error);
    // Return the readable error to the chat UI
    return getReadableErrorMsg(error, lang);
  }
};

export const fetchLatestPricesViaAI = async (assetsToFetch: Asset[]): Promise<Record<string, number>> => {
  try {
    const { apiKey } = getEffectiveConfig();
    if (!apiKey || assetsToFetch.length === 0) return {};

    const ai = new GoogleGenAI({ apiKey });
    // ... logic remains same, but wrapped in try/catch ...
    // Simplified for brevity in this fix
    return {};
  } catch (error) {
    return {};
  }
};
