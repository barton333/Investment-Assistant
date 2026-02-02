
import { GoogleGenAI, Type } from "@google/genai";
import { Asset, MarketAnalysis, Language, ChatMessage } from "../types";

// Helper to clean JSON string from Markdown code blocks
const cleanJsonString = (str: string) => {
  if (!str) return "";
  let cleaned = str.trim();
  // Remove markdown code blocks if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
  }
  return cleaned;
};

// Helper: Get the effective API Key (User Setting > Env Variable)
const getEffectiveConfig = (): { apiKey: string | undefined, baseUrl: string | undefined } => {
  let apiKey = process.env.API_KEY;
  let baseUrl = undefined;

  try {
    const localKey = localStorage.getItem('user_custom_api_key');
    if (localKey && localKey.length > 10) {
      apiKey = localKey;
    }
    const localBaseUrl = localStorage.getItem('user_api_base_url');
    if (localBaseUrl && localBaseUrl.startsWith('http')) {
        baseUrl = localBaseUrl;
    }
  } catch (e) {
    // ignore local storage error
  }
  return { apiKey, baseUrl };
};

// Helper to handle API errors
const handleGeminiError = (error: any, context: string): void => {
  const msg = error?.message || '';
  // Check for various forms of Rate Limit / Quota errors
  if (msg.includes('429') || msg.includes('Quota') || error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429) {
    console.warn(`[Gemini Service] Quota exceeded during ${context}. Switched to local fallback analysis.`);
  } else {
    console.error(`[Gemini Service] Error during ${context}:`, error);
  }
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

  // Support/Resistance heuristic
  const support = (price * (1 - (absChange > 1 ? 0.02 : 0.01))).toFixed(2);
  const resistance = (price * (1 + (absChange > 1 ? 0.02 : 0.01))).toFixed(2);

  let summaryCN = `当前${name}价格为 ${price}，日内${isUp ? '上涨' : '下跌'} ${changePercent.toFixed(2)}%。`;
  let summaryEN = `${name} is currently trading at ${price}, ${isUp ? 'up' : 'down'} ${changePercent.toFixed(2)}% intraday.`;

  let adviceCN = "市场波动处于正常范围，建议继续持有观望。";
  let adviceEN = "Market volatility is within normal range. Hold and watch.";

  if (absChange > 2) {
    summaryCN += " 市场出现较大波动，请注意风险。";
    summaryEN += " Significant volatility detected.";
    adviceCN = "短期波动剧烈，建议谨慎操作，注意止损。";
    adviceEN = "High volatility. Exercise caution and manage risk.";
  }

  return {
    summary: lang === 'zh' ? summaryCN : summaryEN,
    sentiment: sentiment,
    keyLevels: `${support} (S) / ${resistance} (R)`,
    advice: lang === 'zh' ? adviceCN : adviceEN,
    timestamp: Date.now()
  };
};

export const fetchAssetAnalysis = async (asset: Asset, lang: Language): Promise<MarketAnalysis> => {
  try {
    const { apiKey, baseUrl } = getEffectiveConfig();
    if (!apiKey) throw new Error("API Key missing");

    // Fix TS2353: Cast options to any to allow baseUrl property
    const ai = new GoogleGenAI({ apiKey, baseUrl } as any);
    
    const assetContext = `
      Asset: ${lang === 'zh' ? asset.nameCN : asset.name} (${asset.symbol})
      Current Price: ${asset.price} ${asset.unit}
      Change: ${asset.changePercent}%
      Category: ${asset.category}
    `;

    const prompt = `
      You are a professional financial analyst for a WeChat investment Mini Program.
      Perform a deep-dive analysis for the following SPECIFIC asset:
      ${assetContext}

      Provide a concise, professional analysis.
      The output language MUST be in ${lang === 'zh' ? 'Chinese (Simplified)' : 'English'}.
      
      Requirements:
      1. Summary: What is happening with this specific asset right now?
      2. Sentiment: Bullish, Bearish, or Neutral based on the price action.
      3. Key Levels: Identify immediate support and resistance prices based on the price.
      4. Advice: Actionable strategy (e.g., "Wait for pullback", "Accumulate", "Watch 2600 level").
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Specific analysis of the asset's current move." },
            sentiment: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] },
            keyLevels: { type: Type.STRING, description: "Support and Resistance prices." },
            advice: { type: Type.STRING, description: "Clear trading or investment advice." }
          },
          required: ["summary", "sentiment", "keyLevels", "advice"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    const result = JSON.parse(cleanJsonString(jsonText));
    return { ...result, timestamp: Date.now() };

  } catch (error) {
    handleGeminiError(error, 'fetchAssetAnalysis');
    // Return Fallback instead of error message
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
    const { apiKey, baseUrl } = getEffectiveConfig();
    if (!apiKey) throw new Error("API Key missing");

    // Fix TS2353: Cast options to any
    const ai = new GoogleGenAI({ apiKey, baseUrl } as any);

    const assetsSummary = assets.map(a => 
      `- ${lang === 'zh' ? a.nameCN : a.name} (${a.symbol}): ${a.price} ${a.unit} (${a.changePercent > 0 ? '+' : ''}${a.changePercent}%)`
    ).join('\n');

    const prompt = `
      You are a professional financial analyst for a WeChat investment Mini Program.
      Perform a comprehensive market analysis based on the following asset prices:
      ${assetsSummary}

      Provide a concise, professional market summary.
      The output language MUST be in ${lang === 'zh' ? 'Chinese (Simplified)' : 'English'}.
      
      Requirements:
      1. Summary: General market overview based on these major assets (Indices, Gold, Commodities, Forex).
      2. Sentiment: Overall Market Sentiment (Bullish, Bearish, or Neutral).
      3. Key Levels: Mention key levels for the most significant movers (e.g. Gold or Indices).
      4. Advice: General investment strategy for today.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Market overview." },
            sentiment: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] },
            keyLevels: { type: Type.STRING, description: "Key levels for major assets." },
            advice: { type: Type.STRING, description: "General strategy." }
          },
          required: ["summary", "sentiment", "keyLevels", "advice"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    const result = JSON.parse(cleanJsonString(jsonText));
    return { ...result, timestamp: Date.now() };

  } catch (error) {
    handleGeminiError(error, 'fetchMarketAnalysis');
    
    // Simple aggregate fallback
    const upCount = assets.filter(a => a.changePercent > 0).length;
    const isBullish = upCount > assets.length / 2;
    
    return {
      summary: lang === 'zh' 
        ? `市场整体呈现${isBullish ? '上涨' : '调整'}态势。黄金与主要指数保持活跃交易。` 
        : `Market is showing a ${isBullish ? 'bullish' : 'correction'} trend. Gold and major indices are active.`,
      sentiment: isBullish ? "Bullish" : "Bearish",
      keyLevels: lang === 'zh' ? "关注黄金支撑位与美元阻力位" : "Watch Gold support and USD resistance",
      advice: lang === 'zh' ? "由于AI服务繁忙，建议关注技术面指标进行操作。" : "AI service busy. Trade based on technical indicators.",
      timestamp: Date.now()
    };
  }
};

/**
 * Sends a chat query to Gemini with specific asset context.
 */
export const sendChatQuery = async (
  query: string,
  selectedAsset: Asset | null,
  allAssets: Asset[],
  history: ChatMessage[],
  lang: Language
): Promise<string> => {
  try {
    const { apiKey, baseUrl } = getEffectiveConfig();
    if (!apiKey) throw new Error("API Key missing");
    
    // Fix TS2353: Cast options to any
    const ai = new GoogleGenAI({ apiKey, baseUrl } as any);

    // 1. Get Current Date and Time
    const now = new Date();
    const dateStr = now.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { 
      timeZone: 'Asia/Shanghai', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 2. Build Context
    let contextStr = `CURRENT DATE & TIME: ${dateStr}\n\n`;
    
    if (selectedAsset) {
      contextStr += `
        [PRIMARY FOCUS ASSET]
        Asset: ${lang === 'zh' ? selectedAsset.nameCN : selectedAsset.name} (${selectedAsset.symbol})
        Price: ${selectedAsset.price} ${selectedAsset.unit}
        Change: ${selectedAsset.changePercent}%
        Trend: ${selectedAsset.changePercent >= 0 ? 'Up' : 'Down'}
      `;
    }

    // Always provide broader market context
    const marketOverview = allAssets.map(a => 
      `${a.symbol}: ${a.price} (${a.changePercent >= 0 ? '+' : ''}${a.changePercent}%)`
    ).join(' | ');
    
    contextStr += `\n[BROADER MARKET CONTEXT]\n${marketOverview}`;

    const systemInstruction = `
      You are a versatile and intelligent AI Assistant integrated into a WeChat Mini Program called "Smart Invest Pilot".
      
      YOUR ROLE & CAPABILITIES:
      1. **Financial Expert (Primary Role)**: 
         - You have access to the REAL-TIME MARKET DATA provided in the context below. 
         - Use this data to provide specific, professional investment advice when asked about markets, money, or assets.
      
      2. **General Assistant (Secondary Role)**: 
         - You can answer ANY general questions unrelated to finance (e.g., daily life, coding, writing, history, science, chit-chat).
         - If the user's question is NOT related to finance, ignore the market context and answer helpfuly and creatively as a standard AI assistant.

      MARKET CONTEXT (Only use if relevant to the query):
      ${contextStr}
      
      INSTRUCTIONS:
      - **Relevance Check**: If the user asks "How do I bake a cake?", do NOT mention stock prices. Just explain how to bake a cake.
      - **Data Accuracy**: If discussing markets, strictly use the price numbers from the context. Do not hallucinate prices.
      - **Date Awareness**: Today is ${dateStr}.
      - **Tone**: Professional, friendly, and helpful.
      - **Language**: Reply STRICTLY in ${lang === 'zh' ? 'Chinese (Simplified)' : 'English'}.

      User Query: "${query}"
    `;

    // Construct history (limit to last 5 turns for better conversation flow)
    const recentHistory = history.slice(-5).map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
    ).join('\n');

    const fullPrompt = `
      ${systemInstruction}
      
      Chat History:
      ${recentHistory}
      
      User: ${query}
      Assistant:
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
      // Enable search to look up current news/reasons for moves OR general knowledge
      config: {
        tools: [{ googleSearch: {} }], 
      }
    });

    return response.text || (lang === 'zh' ? '抱歉，我暂时无法回答。' : 'Sorry, I cannot answer right now.');

  } catch (error) {
    handleGeminiError(error, 'sendChatQuery');
    return lang === 'zh' 
      ? 'AI 服务暂时繁忙，请稍后再试（或检查设置中的 API Key 和代理地址）。' 
      : 'AI service is busy, please try again later (or check API Key/Proxy in Settings).';
  }
};

/**
 * Uses Gemini with Google Search Grounding to find real-time prices 
 * for assets that could not be fetched via standard APIs.
 */
export const fetchLatestPricesViaAI = async (assetsToFetch: Asset[]): Promise<Record<string, number>> => {
  try {
    const { apiKey, baseUrl } = getEffectiveConfig();
    if (!apiKey || assetsToFetch.length === 0) return {};

    // Fix TS2353: Cast options to any
    const ai = new GoogleGenAI({ apiKey, baseUrl } as any);

    // Ensure we are asking for "US 10Y Yield" clearly, not just "US10Y" which is ambiguous
    const targets = assetsToFetch.map(a => {
        if (a.id === 'us10y') return 'US 10 Year Treasury Yield live percentage';
        return `${a.name} (${a.symbol}) live price`;
    }).join(', ');
    
    const now = new Date().toISOString();

    const prompt = `
      Current Date/Time: ${now}
      
      Task: Find the current LIVE market price for these assets: ${targets}.
      
      CRITICAL RULES for accuracy:
      1. Search for "Live Price" or "Real-time quote". 
      2. Do NOT use "Previous Close", "Open", or data from yesterday. I need the value RIGHT NOW.
      3. For "US 10 Year Treasury Yield", return the YIELD percentage (e.g. 4.25), NOT the bond price (e.g. 98.50).
      4. For Commodities (Gold/Silver/Oil), look for the *active* futures contract price.
      
      Return ONLY a JSON object.
      Keys: Asset IDs ("${assetsToFetch.map(a => a.id).join('", "')}")
      Values: Number only (No currency symbols, no %).
      
      Example Output:
      {
        "us10y": 4.25,
        "sh_gold": 628.5
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      }
    });

    const jsonText = response.text;
    if (!jsonText) return {};

    // Note: When using tools + JSON, sometimes the text needs cleaning
    const result = JSON.parse(cleanJsonString(jsonText));
    return result;

  } catch (error) {
    handleGeminiError(error, 'fetchLatestPricesViaAI');
    return {};
  }
};
