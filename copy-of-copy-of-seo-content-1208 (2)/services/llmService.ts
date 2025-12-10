import { KeywordMap, Model, ApiProvider } from '../types';
import { extractValidJSON } from './jsonParser';
import { SEO_PROMPT_TEMPLATE, LSI_GENERATION_PROMPT_TEMPLATE, ARTICLE_PROMPT_TEMPLATE, TRANSLATE_PROMPT_TEMPLATE, BATCH_TRANSLATE_PROMPT_TEMPLATE } from '../constants';
import { z } from 'zod';

// --- Zod Schemas for Runtime Validation ---

const LsiSchema = z.string().array();

const Level2Schema = z.object({
    keyword: z.string(),
    type: z.string(),
    lsi: LsiSchema.optional().default([]),
});

const Level1Schema = z.object({
    keyword: z.string(),
    type: z.string(), // e.g. 引流型
    pageType: z.string(), // e.g. 文章类
    children: z.array(Level2Schema),
});

const KeywordMapSchema = z.object({
    coreUserIntent: z.string(),
    originalKeywords: z.object({
        traffic: z.array(z.string()),
        comparison: z.array(z.string()),
        conversion: z.array(z.string()),
    }),
    keywordHierarchy: z.array(Level1Schema),
});

const TranslationMapSchema = z.record(z.string(), z.string());


// --- Utility: Clean DeepSeek Reasoning ---
function cleanModelOutput(text: string): string {
    // Ensure text is a string and replace has 2 arguments to satisfy strict TS/Linter checks
    const strVal = text === null || text === undefined ? '' : String(text);
    return strVal.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// --- Unified Call Router ---

async function callOpenAiCompatibleApi(
    prompt: string, 
    model: Model, 
    options: { jsonMode?: boolean, stream?: boolean, onStream?: (chunk: string) => void } = {}
): Promise<string> {
    const baseUrl = model.baseURL?.replace(/\/+$/, '') || 'https://api.openai.com/v1';
    const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

    const isDeepSeekReasoner = model.id.includes('reasoner') || model.id.includes('R1');

    const body: any = {
        model: model.id,
        messages: [{ role: 'user', content: prompt }],
        stream: options.stream || false,
    };

    if (options.jsonMode && !isDeepSeekReasoner) {
        body.response_format = { type: "json_object" };
    }
    
    if (!isDeepSeekReasoner) {
        body.temperature = 0.7;
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${model.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${model.apiProvider}): ${response.status} - ${errorText}`);
    }

    // Handle Streaming
    if (options.stream && options.onStream) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        if (!reader) throw new Error("Response body is not readable for streaming.");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(line.substring(6));
                        const content = json.choices[0]?.delta?.content || '';
                        if (content) {
                            fullText += content;
                            options.onStream(content);
                        }
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }
        return fullText;
    }

    // Handle Standard Request
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

async function callGeminiApi(
    prompt: string, 
    model: Model, 
    options: { jsonMode?: boolean, stream?: boolean, onStream?: (chunk: string) => void } = {}
): Promise<string> {
    
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt, 
                modelId: model.id,
                jsonMode: options.jsonMode,
                stream: options.stream 
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Gemini proxy error: ${response.status}`);
        }
        
        if (options.stream && options.onStream) {
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            
            if (!reader) throw new Error("Stream not readable");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                
                // Google sends a JSON Array structure [{},{},...] often split across chunks.
                // Instead of trying to parse the full invalid JSON array, we use regex to extract the "text" field values.
                // This is robust against the chunk boundaries of the proxy.
                const regex = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
                let match;
                
                while ((match = regex.exec(chunk)) !== null) {
                    if (match[1]) {
                        // Unescape the JSON string content (e.g. \n -> newline)
                        try {
                            const content = JSON.parse(`"${match[1]}"`); 
                            fullText += content;
                            options.onStream(content);
                        } catch (e) {
                            // If parse fails (rare), ignore just this fragment
                        }
                    }
                }
            }
            return fullText;
        }

        // Standard response
        const data = await response.json();
        return data.text;

    } catch (error) {
        throw new Error(`Gemini Error: ${(error as Error).message}`);
    }
}

// --- Unified LLM Caller ---

async function callLlm(
    prompt: string, 
    model: Model, 
    options: { jsonMode?: boolean, stream?: boolean, onStream?: (chunk: string) => void } = {}
): Promise<string> {
    // Determine provider logic
    if (model.apiProvider === ApiProvider.GEMINI) {
        return callGeminiApi(prompt, model, options);
    } else {
        return callOpenAiCompatibleApi(prompt, model, options);
    }
}


// --- PUBLIC SERVICES ---

export const verifyModelConnection = async (model: Model): Promise<{success: boolean, message: string}> => {
    try {
        await callLlm("Hi", model); 
        return { success: true, message: "Connection verified!" };
    } catch (e) {
        return { success: false, message: (e as Error).message };
    }
}

export const generateKeywordMap = async (initialKeywords: string, extraInstructions: string, model: Model, promptTemplate: string = SEO_PROMPT_TEMPLATE): Promise<KeywordMap> => {
  const prompt = promptTemplate
    .replace('{initialKeywords}', initialKeywords)
    .replace('{extraInstructions}', extraInstructions || 'None');
  
  try {
    const rawResponse = await callLlm(prompt, model, { jsonMode: true });
    const cleanedResponse = cleanModelOutput(rawResponse);
    const json = extractValidJSON(cleanedResponse);
    return KeywordMapSchema.parse(json) as KeywordMap;
  } catch (error) {
    console.error("Keyword Map Generation Error:", error);
    throw new Error(`Failed to generate valid keyword map: ${(error as Error).message}`);
  }
};

export const generateLsiForNode = async (context: any, model: Model): Promise<string[]> => {
    const prompt = LSI_GENERATION_PROMPT_TEMPLATE
        .replace(/{level2Keyword}/g, context.level2Keyword)
        .replace('{level1Keyword}', context.level1Keyword)
        .replace('{level2Type}', context.level2Type)
        .replace('{existingLSI}', context.existingLSI.join(', ') || 'None');

    try {
        const rawResponse = await callLlm(prompt, model, { jsonMode: true });
        const cleanedResponse = cleanModelOutput(rawResponse);
        const json = extractValidJSON(cleanedResponse);
        return LsiSchema.parse(json);
    } catch(error) {
        console.error("LSI Generation Error:", error);
        throw error;
    }
};

/**
 * Generates an article with support for real-time streaming.
 */
export const generateArticleStream = async (
    keywordContext: string, 
    model: Model, 
    promptTemplate: string,
    onChunk: (chunk: string) => void
): Promise<string> => {
    const prompt = promptTemplate.replace('{keywordContext}', keywordContext);
    
    try {
        return await callLlm(prompt, model, { 
            jsonMode: false, 
            stream: true, 
            onStream: onChunk 
        });
    } catch (error) {
        console.error("Article Generation Error:", error);
        throw error;
    }
};

/**
 * Translates text with support for streaming.
 */
export const translateTextStream = async (
    textToTranslate: string, 
    targetLanguage: string, 
    model: Model, 
    onChunk: (chunk: string) => void
): Promise<string> => {
    const prompt = `You are a professional translator. Translate the following content into ${targetLanguage}. 
    
    **Instructions:**
    1. Maintain the original Markdown formatting (headers, bolding, lists) exactly.
    2. Ensure the tone is natural and native to the target language.
    3. Return ONLY the translation, no preamble or explanation.

    **Content:**
    ${textToTranslate}`;

    try {
        return await callLlm(prompt, model, { 
            jsonMode: false,
            stream: true,
            onStream: onChunk
        });
    } catch (error) {
        throw error;
    }
};

// Legacy non-streaming wrapper
export const generateArticle = async (keywordContext: string, model: Model, promptTemplate: string): Promise<string> => {
    return generateArticleStream(keywordContext, model, promptTemplate, () => {});
}

export const translateText = async (textToTranslate: string, model: Model): Promise<string> => {
    const prompt = TRANSLATE_PROMPT_TEMPLATE.replace('{textToTranslate}', textToTranslate);
    try {
        return await callLlm(prompt, model, { jsonMode: false });
    } catch (error) {
        throw error;
    }
};

export const translateBatch = async (texts: string[], model: Model): Promise<Record<string, string>> => {
    if (texts.length === 0) return {};
    const prompt = BATCH_TRANSLATE_PROMPT_TEMPLATE.replace('{jsonStringArray}', JSON.stringify(texts));

    try {
        const rawResponse = await callLlm(prompt, model, { jsonMode: true });
        const cleanedResponse = cleanModelOutput(rawResponse);
        const json = extractValidJSON(cleanedResponse);
        return TranslationMapSchema.parse(json) as Record<string, string>;
    } catch(error) {
        throw error;
    }
};

export const fetchRemoteModels = async (baseUrl: string, apiKey: string): Promise<{id: string, name?: string}[]> => {
    const url = baseUrl.replace(/\/+$/, '') + '/models';
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
    }
    
    const data = await response.json();
    const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
    return list.map((m: any) => ({ id: m.id || m, name: m.id || m }));
}