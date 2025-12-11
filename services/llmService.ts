import { KeywordMap, Model, ApiProvider } from '../types';
import { extractValidJSON } from './jsonParser';
import { SEO_PROMPT_TEMPLATE, LSI_GENERATION_PROMPT_TEMPLATE, ARTICLE_PROMPT_TEMPLATE, TRANSLATE_PROMPT_TEMPLATE, BATCH_TRANSLATE_PROMPT_TEMPLATE, KEYWORD_MAP_JSON_STRUCTURE } from '../constants';
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

// --- SECURE BACKEND API CLIENT ---
// Note: callGeminiApi is deprecated in favor of unified backend proxy
// but kept if special frontend logic is needed. 
// Ideally, the backend handles all provider differences.

// --- SECURE BACKEND API CLIENT ---
import { secureFetch } from './api';

// --- HYBRID LLM CALLER (SaaS + BYOK) ---

async function callOpenAiCompatibleApi(
    prompt: string,
    model: Model,
    options: { jsonMode?: boolean, stream?: boolean, onStream?: (chunk: string) => void, timeout?: number } = {}
): Promise<string> {
    const isDeepSeekReasoner = model.id.includes('reasoner') || model.id.includes('R1');
    const isSaaSMode = !model.api_key || model.api_key.length < 5; // Heuristic: No key = SaaS Mode

    if (isSaaSMode) {
        // --- 1. SaaS Proxy Mode ---
        return callProxyOpenAi(prompt, model, options, isDeepSeekReasoner);
    } else {
        // --- 2. Direct BYOK Mode ---
        return callDirectOpenAi(prompt, model, options, isDeepSeekReasoner);
    }
}

// Sub-function: SaaS Proxy Logic
async function callProxyOpenAi(prompt: string, model: Model, options: any, isDeepSeekReasoner: boolean) {
    const payload = {
        model: model.id,
        messages: [{ role: 'user', content: prompt }],
        stream: options.stream || false,
        jsonMode: options.jsonMode,
    };

    try {
        if (options.stream && options.onStream) {
            // 1. Get Token manually for streaming fetch
            const { data } = await import('./supabaseClient').then(m => m.supabase?.auth.getSession() || { data: { session: null } });
            const token = data.session?.access_token;
            if (!token) throw new Error("SaaS Mode requires login.");

            const response = await fetchWithRetry('/api/llm/openai-compatible', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            }, 3, options.timeout || 60000);

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`SaaS API Error: ${response.status} - ${errText}`);
            }

            return handleStreamResponse(response, options.onStream);
        } else {
            // Standard Request via helper
            const data: any = await secureFetch('llm/openai-compatible', 'POST', payload);
            return data.choices?.[0]?.message?.content || '';
        }
    } catch (error) {
        console.error("SaaS LLM Call Failed:", error);
        throw error;
    }
}

// Sub-function: Direct BYOK Logic
async function callDirectOpenAi(prompt: string, model: Model, options: any, isDeepSeekReasoner: boolean) {
    const baseUrl = model.base_url?.replace(/\/+$/, '') || 'https://api.openai.com/v1';
    const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;

    const body: any = {
        model: model.id,
        messages: [{ role: 'user', content: prompt }],
        stream: options.stream || false,
    };

    if (options.jsonMode && !isDeepSeekReasoner) {
        body.response_format = { type: "json_object" };
    }

    // Strict temperature control for DeepSeek R1 (Recommendation: don't set it, or use default)
    if (!isDeepSeekReasoner) {
        body.temperature = 0.7;
    }

    try {
        const response = await fetchWithRetry(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${model.api_key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        }, 3, options.timeout || 60000);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Direct API Error (${model.api_provider}): ${response.status} - ${errorText}`);
        }

        const contentType = response.headers.get('Content-Type') || '';

        if (options.stream && options.onStream) {
            // Check if provider actually returned a stream
            if (contentType.includes('text/event-stream')) {
                return handleStreamResponse(response, options.onStream);
            } else {
                // Fallback: Provider ignored stream=true or returned JSON error/result
                // We treat it as a standard single-message response but trigger onStream once
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';
                if (content) {
                    options.onStream(content);
                }
                return content;
            }
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';

    } catch (error) {
        console.error("Direct LLM Call Failed:", error);
        throw error;
    }
}

// Helper: Shared Stream Parser (OpenAI Format)
async function handleStreamResponse(response: Response, onStream: (chunk: string) => void): Promise<string> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (!reader) throw new Error("Stream not readable");

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                    const jsonStr = line.replace('data: ', '').trim();
                    if (!jsonStr) continue;
                    const json = JSON.parse(jsonStr);
                    const content = json.choices?.[0]?.delta?.content || json.error || ''; // Handle error field from proxy
                    if (content) {
                        fullText += content;
                        onStream(content);
                    }
                } catch (e) { }
            }
        }
    }
    return fullText;
}

// Map Gemini calls to the unified router (Assuming Gemini also supports OpenAI format via proxy or has key)
async function callGeminiApi(prompt: string, model: Model, options: any) {
    return callOpenAiCompatibleApi(prompt, model, options);
}

// --- Unified LLM Caller ---

// --- Helper: Robust Fetch ---
async function fetchWithRetry(url: string, options: any, retries = 3, timeoutMs = 60000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const config = { ...options, signal: controller.signal };

    try {
        const response = await fetch(url, config);
        clearTimeout(id);

        if (response.status === 429 || response.status >= 500) {
            if (retries > 0) {
                const waitTime = 1000 * Math.pow(2, 3 - retries); // 1s, 2s, 4s
                console.warn(`Fetch failed (${response.status}), retrying in ${waitTime}ms...`);
                await new Promise(r => setTimeout(r, waitTime));
                return fetchWithRetry(url, options, retries - 1, timeoutMs);
            }
        }
        return response;
    } catch (error: any) {
        clearTimeout(id);
        if (retries > 0 && error.name !== 'AbortError') {
            console.warn(`Fetch network error, retrying...`, error);
            await new Promise(r => setTimeout(r, 1000));
            return fetchWithRetry(url, options, retries - 1, timeoutMs);
        }
        throw error;
    }
}


// --- Unified LLM Caller ---

export async function callLlm(
    prompt: string,
    model: Model,
    options: { jsonMode?: boolean, stream?: boolean, onStream?: (chunk: string) => void, timeout?: number } = {}
): Promise<string> {
    const timeout = options.timeout || 60000; // Default 60s timeout

    // Override internal fetch calls in sub-functions to use fetchWithRetry (Conceptually)
    // Actually, we must refactor callOpenAiCompatibleApi to accept timeout and use the helper.
    // For now, let's wrap the logic or update the sub-functions. 

    // We will update the sub-functions below to use fetchWithRetry.
    return callOpenAiCompatibleApi(prompt, model, { ...options, timeout });
}

// ... logic continues ...
// NOTE: I need to update callDirectOpenAi and callProxyOpenAi signatures to accept timeout and use fetchWithRetry
// See next steps.


// --- PUBLIC SERVICES ---


export const verifyModelConnection = async (model: Model): Promise<{ success: boolean, message: string }> => {
    try {
        await callLlm("Hi", model);
        return { success: true, message: "Connection verified!" };
    } catch (e) {
        return { success: false, message: (e as Error).message };
    }
}

export const generateKeywordMap = async (initialKeywords: string, extraInstructions: string, model: Model, promptTemplate: string = SEO_PROMPT_TEMPLATE): Promise<KeywordMap> => {
    // Enforce strict JSON structure by appending it to the user's template (or default)
    // regardless of what the user defines in the prompt editor.
    const basePrompt = promptTemplate
        .replace('{initialKeywords}', initialKeywords)
        .replace('{extraInstructions}', extraInstructions || 'None');

    const prompt = `${basePrompt}\n\n${KEYWORD_MAP_JSON_STRUCTURE}`;
    const MAX_RETRIES = 2;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            // For retries, we could potentially adjust temperature or add a "correction" instruction
            const rawResponse = await callLlm(prompt, model, { jsonMode: true });
            const cleanedResponse = cleanModelOutput(rawResponse);
            console.log(`[GenerateKeywordMap] Attempt ${attempt + 1} Raw Response:`, cleanedResponse);

            let json: any;
            try {
                json = extractValidJSON(cleanedResponse);
            } catch (jsonErr) {
                // If JSON extraction fails, throw specifically so we can retry
                throw new Error(`JSON Processing Failed: ${(jsonErr as Error).message}`);
            }

            // check if the model returned an error object instead of the map
            if (json.error) {
                throw new Error(`Model/API returned error object: ${JSON.stringify(json.error)}`);
            }
            // Check for missing keys explicitly to give better error than Zod
            if (!json.coreUserIntent && !json.keywordHierarchy) {
                throw new Error("Response JSON missing critical fields (coreUserIntent/keywordHierarchy).");
            }

            return KeywordMapSchema.parse(json) as KeywordMap;
        } catch (error) {
            console.warn(`Keyword Map Generation Attempt ${attempt + 1} Failed:`, error);
            if (attempt === MAX_RETRIES) {
                console.error("All Keyword Map Generation attempts failed.");
                throw new Error(`Failed to generate valid keyword map after ${MAX_RETRIES + 1} attempts: ${(error as Error).message}`);
            }
            // Optional: Wait a bit before retry? callLlm handles network retries, but this is Logic retry.
            // Small delay to prevent tight loop if using a fast local model with same seed
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    throw new Error("Unexpected error in generateKeywordMap");
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
    } catch (error) {
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
    return generateArticleStream(keywordContext, model, promptTemplate, () => { });
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
    } catch (error) {
        throw error;
    }
};

export const fetchRemoteModels = async (baseUrl: string, apiKey: string): Promise<{ id: string, name?: string }[]> => {
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