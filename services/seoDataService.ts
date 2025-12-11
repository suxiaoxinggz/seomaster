
import { SeoConfig, SeoSearchParams, KeywordMetric, SerpAnalysisData, AiVisibilityData, SerpItem, SeoMetrics, ContentGenParams, ContentGenResult } from '../types';



// --- Helper: Random Generators for Mock Data (Enhanced) ---
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
const randomTrend = () => Array.from({ length: 12 }, () => randomInt(20, 100));

const generateMockKeywordMetric = (keyword: string): KeywordMetric => {
    const vol = randomInt(50, 8000);
    const comp = Math.random();
    return {
        keyword,
        search_volume: vol,
        clickstream_volume: Math.floor(vol * (0.6 + Math.random() * 0.3)),
        is_normalized: true,
        cpc: parseFloat((Math.random() * 8).toFixed(2)),
        competition: comp,
        competition_level: comp > 0.7 ? 'HIGH' : (comp > 0.3 ? 'MEDIUM' : 'LOW'),
        keyword_difficulty: randomInt(10, 80),
        search_intent: ['informational', 'commercial', 'transactional', 'navigational'][Math.floor(Math.random() * 4)],
        trend_history: randomTrend(),
        low_top_of_page_bid: parseFloat((Math.random() * 2).toFixed(2)),
        high_top_of_page_bid: parseFloat((Math.random() * 12).toFixed(2)),
        updated_at: new Date().toISOString()
    };
};

const generateMockSerp = (keyword: string): SerpAnalysisData => {
    const items: SerpItem[] = [];

    // Featured Snippet
    if (Math.random() > 0.6) {
        items.push({
            type: 'featured_snippet',
            rank_group: 1,
            rank_absolute: 1,
            title: `The Ultimate Guide to ${keyword}`,
            url: `https://authority-example.com/${keyword.replace(/\s+/g, '-')}`,
            description: `Here is a direct answer about ${keyword}. It involves key steps A, B, and C to achieve the result.`,
            domain: 'authority-example.com',
            breadcrumbs: 'Home > Guides > Topic'
        });
    }

    // Organic
    for (let i = 1; i <= 10; i++) {
        items.push({
            type: 'organic',
            rank_group: i,
            rank_absolute: items.length + 1,
            title: `Top ${i} Tips for ${keyword} in 2024`,
            url: `https://competitor-${i}.com/post/${keyword.replace(/\s+/g, '-')}`,
            description: `Comprehensive analysis of ${keyword}. We compare top brands and give you the best advice for...`,
            domain: `competitor-${i}.com`,
            breadcrumbs: `Competitor ${i} > Blog`
        });
    }

    return {
        keyword,
        location_code: 2840,
        language_code: 'en',
        items,
        people_also_ask: [
            `What is the cost of ${keyword}?`,
            `How to use ${keyword} effectively?`,
            `Is ${keyword} worth it?`,
            `Best alternatives to ${keyword}`
        ],
        related_searches: [`${keyword} reddit`, `${keyword} free`, `${keyword} for beginners`, `best ${keyword}`],
        created_at: new Date().toISOString()
    };
};

const generateMockContentGen = (params: ContentGenParams): ContentGenResult => {
    if (params.mode === 'check_grammar') {
        return {
            input_text: params.text,
            corrected_text: params.text?.replace(/dont/g, "don't").replace(/teh/g, "the"),
            grammar_errors: [
                { type: "spelling", description: "Possible typo 'teh'", suggestions: ["the"] },
                { type: "grammar", description: "Missing apostrophe in 'dont'", suggestions: ["don't"] }
            ]
        };
    } else if (params.mode === 'text_summary') {
        return {
            sentences: 5,
            words: 120,
            readability_score: 65.4,
            grade_level: 8,
            vocabulary_density: 0.7
        };
    } else if (params.mode === 'generate_meta_tags') {
        const titleBase = params.text?.substring(0, 30) || 'Content';
        return {
            meta_title: `${titleBase} - Ultimate Guide [2024 Update] | MySite`,
            meta_description: `Learn everything about ${titleBase}. We cover features, pricing, and pros/cons in this comprehensive guide. Click to read more.`
        };
    } else if (params.mode === 'generate_sub_topics') {
        const topic = params.topic || 'General Topic';
        return {
            sub_topics: [
                `Introduction to ${topic}`,
                `Key Benefits of ${topic}`,
                `Common Misconceptions`,
                `Step-by-Step Guide`,
                `Advanced Strategies`,
                `Case Studies`,
                `Future Trends in ${topic}`,
                `Conclusion and Takeaways`
            ]
        };
    } else {
        return {
            generated_text: `[MOCK] Generated content for ${params.topic || params.text}. This is a simulated response for demonstration purposes.`,
            input_tokens: 20,
            output_tokens: 50,
            new_tokens: 50
        };
    }
};

// --- REAL API CLIENT ---

// --- HYBRID API CLIENT (SaaS + BYOK) ---
import { secureFetch } from './api';
import { DFS_BASE } from '../constants'; // Ensure this is imported if not already

async function dfsRequest(endpoint: string, payload: any[], config: SeoConfig) {
    // 1. Check for "Bring Your Own Key" (BYOK) mode
    if (config.apiLogin && config.apiPassword) {
        // --- Direct Mode ---
        try {
            const auth = btoa(`${config.apiLogin}:${config.apiPassword}`);
            const baseUrl = config.baseUrl ? config.baseUrl.replace(/\/+$/, '') : DFS_BASE;
            const fullUrl = `${baseUrl}/${endpoint}`;

            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                const msg = errorBody.tasks?.[0]?.status_message || errorBody.status_message || response.statusText;
                throw new Error(`[Direct API] Error (${response.status}): ${msg}`);
            }

            const data = await response.json();
            if (data.status_code !== 20000) {
                const taskError = data.tasks?.[0]?.status_message || data.status_message;
                throw new Error(`[Direct API] Task Failed: ${taskError}`);
            }
            return data.tasks;

        } catch (error) {
            console.error(`DFS Direct Request Failed [${endpoint}]:`, error);
            throw error;
        }
    } else {
        // --- SaaS Proxy Mode ---
        // No local keys found? Use the secure backend.
        try {
            const backendPath = `dataforseo/${endpoint}`;
            const tasks: any = await secureFetch(backendPath, 'POST', payload);

            if (tasks.status_code && tasks.status_code !== 20000) {
                const taskError = tasks.tasks?.[0]?.status_message || tasks.status_message || "Unknown API Error";
                throw new Error(`[SaaS API] Task Failed: ${taskError}`);
            }

            if (tasks.tasks) return tasks.tasks;
            return tasks.tasks || [];

        } catch (error) {
            console.error(`DFS SaaS Request Failed [${endpoint}]:`, error);
            // Enhance error message to guide user
            if ((error as Error).message.includes('401') || (error as Error).message.includes('Authentication')) {
                throw new Error("SaaS Authentication Failed. Please log in or check your subscription.");
            }
            throw error;
        }
    }
}

// --- MAPPER FUNCTIONS (Critical for robustness) ---

export const mapDfsItemToMetric = (item: any): KeywordMetric => {
    // 1. Base Info
    // DataForSEO Labs returns 'keyword_info' for search volume, cpc, etc.
    const info = item.keyword_info || {};

    // 2. Keyword Properties (KD is here)
    const props = item.keyword_properties || {};

    // 3. Clickstream Info (If requested)
    // Docs confirm key is 'clickstream_keyword_info'
    const clickstream = item.clickstream_keyword_info;

    // Determine effective volume
    const hasClickstreamVol = clickstream && (clickstream.search_volume !== null && clickstream.search_volume !== undefined);
    const searchVolume = hasClickstreamVol ? clickstream.search_volume : (info.search_volume || 0);

    // Extract trend
    // 'monthly_searches' is an array of { year, month, search_volume }
    const monthlySearches = info.monthly_searches || [];
    const trends = monthlySearches.map((m: any) => m.search_volume).reverse().slice(0, 12);

    return {
        keyword: item.keyword,

        // Volume
        search_volume: searchVolume,
        clickstream_volume: clickstream?.search_volume,
        is_normalized: !!hasClickstreamVol,
        impressions_potential: item.impressions_info?.daily_impressions_min,

        // CPC & Competition
        cpc: info.cpc || 0,
        low_top_of_page_bid: info.low_top_of_page_bid,
        high_top_of_page_bid: info.high_top_of_page_bid,
        competition: info.competition || 0,
        competition_level: info.competition_level || 'LOW',

        // Difficulty (Crucial Fix: Use props.keyword_difficulty)
        keyword_difficulty: props.keyword_difficulty !== undefined ? props.keyword_difficulty : 0,

        // Intent
        search_intent: info.search_intent_info?.main_intent,

        // History
        trend_history: trends.length > 0 ? trends : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        monthly_searches: monthlySearches,

        // Demographics
        clickstream_age_distribution: clickstream?.age_distribution,
        clickstream_gender_distribution: clickstream?.gender_distribution,

        updated_at: new Date().toISOString()
    };
};


// --- PUBLIC SERVICE METHODS ---

export const fetchKeywordData = async (
    rawInput: string | string[],
    params: SeoSearchParams,
    config: SeoConfig
): Promise<{ overview: KeywordMetric[], related: KeywordMetric[] }> => {

    // 1. Normalize Input
    const keywords = Array.isArray(rawInput)
        ? rawInput
        : rawInput.split('\n').map(k => k.trim()).filter(k => k.length > 0);

    if (keywords.length === 0) return { overview: [], related: [] };

    // --- MOCK MODE ---
    if (config.provider === 'mock') {
        await new Promise(r => setTimeout(r, 1000));
        const overview = keywords.map(k => generateMockKeywordMetric(k));
        let related: KeywordMetric[] = [];
        if (keywords.length === 1) {
            related = Array.from({ length: 8 }, (_, i) => generateMockKeywordMetric(`${keywords[0]} ${['guide', 'review', 'price', 'vs'][i % 4]}`));
        }
        return { overview, related };
    }

    // --- REAL API MODE ---

    // Helper: Chunking for bulk limits (DataForSEO limit is usually 700-1000 per request)
    const chunkArray = <T>(array: T[], size: number): T[][] => {
        const chunked: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunked.push(array.slice(i, i + size));
        }
        return chunked;
    };

    try {
        const overviewChunks = chunkArray(keywords, 700);
        let allOverviewMetrics: KeywordMetric[] = [];
        let allRelatedMetrics: KeywordMetric[] = [];

        // Execute chunks (sequentially to avoid rate limits, or parallel if needed)
        // Using Promise.all for speed, assuming API handles concurrency well (usually 20-50 threads allowed)

        const chunkPromises = overviewChunks.map(async (chunk) => {
            const overviewPayload = [{
                keywords: chunk,
                location_code: params.location_code,
                language_code: params.language_code,
                include_clickstream_data: params.include_clickstream ?? false,
                include_serp_info: false,
                tag: params.tag
            }];
            return dfsRequest('dataforseo_labs/google/keyword_overview/live', overviewPayload, config);
        });

        // Request B: Related Keywords (Only if exploring a single seed)
        const isSingleSeed = keywords.length === 1;
        let relatedPromise: Promise<any> | null = null;

        if (isSingleSeed) {
            const relatedPayload = [{
                keyword: keywords[0],
                location_code: params.location_code,
                language_code: params.language_code,
                depth: params.depth || 1,
                limit: params.limit || 50,
                include_clickstream_data: false
            }];
            relatedPromise = dfsRequest('dataforseo_labs/google/related_keywords/live', relatedPayload, config);
        }

        const [chunkResults, relatedTask] = await Promise.all([
            Promise.all(chunkPromises),
            relatedPromise
        ]);

        // Process Overview Chunks
        chunkResults.forEach(taskResult => {
            const resultItems = taskResult[0]?.result[0]?.items || [];
            const metrics = resultItems.map(mapDfsItemToMetric);
            allOverviewMetrics = [...allOverviewMetrics, ...metrics];
        });

        // Process Related Result
        if (relatedTask) {
            const rawRelated = relatedTask[0]?.result[0]?.items || [];
            allRelatedMetrics = rawRelated.map((item: any) => mapDfsItemToMetric({
                ...item.keyword_data,
            }));
        }

        return {
            overview: allOverviewMetrics,
            related: allRelatedMetrics
        };

    } catch (error) {
        console.error("fetchKeywordData error:", error);
        throw error;
    }
};

export const fetchSerpAnalysis = async (keyword: string, params: SeoSearchParams, config: SeoConfig): Promise<SerpAnalysisData> => {
    if (config.provider === 'mock') {
        await new Promise(r => setTimeout(r, 1500));
        return generateMockSerp(keyword);
    }

    const payload = [{
        keyword: keyword,
        location_code: params.location_code,
        language_code: params.language_code,
        device: params.device || 'desktop',
        os: params.os || 'windows',
        depth: 20 // Fetch top 20
    }];

    try {
        const tasks = await dfsRequest('serp/google/organic/live/advanced', payload, config);
        const result = tasks[0]?.result[0];

        const items: SerpItem[] = [];
        const paa: string[] = [];
        const related: string[] = [];

        if (result && result.items) {
            result.items.forEach((item: any) => {
                // Parse distinct SERP types
                if (item.type === 'organic') {
                    items.push({
                        type: 'organic',
                        rank_group: item.rank_group,
                        rank_absolute: item.rank_absolute,
                        title: item.title,
                        url: item.url,
                        description: item.description,
                        domain: item.domain,
                        breadcrumbs: item.breadcrumb
                    });
                } else if (item.type === 'featured_snippet') {
                    items.push({
                        type: 'featured_snippet',
                        rank_group: item.rank_group,
                        rank_absolute: item.rank_absolute,
                        title: item.title,
                        url: item.url,
                        description: item.description,
                        domain: item.domain
                    });
                } else if (item.type === 'people_also_ask') {
                    // Extract Questions
                    item.items?.forEach((q: any) => {
                        if (q.title) paa.push(q.title);
                    });
                } else if (item.type === 'related_searches') {
                    // Extract Related
                    item.items?.forEach((r: any) => {
                        if (r.keyword) related.push(r.keyword);
                    });
                } else if (item.type === 'images') {
                    // Image pack
                    items.push({
                        type: 'images',
                        rank_group: item.rank_group,
                        rank_absolute: item.rank_absolute,
                        title: item.title || 'Images',
                        url: item.url || '',
                        description: 'Image Pack',
                        domain: 'google.com'
                    });
                }
            });
        }

        return {
            keyword,
            location_code: params.location_code,
            language_code: params.language_code,
            items,
            people_also_ask: paa,
            related_searches: related,
            created_at: new Date().toISOString(),
            search_parameters: params
        };

    } catch (error) {
        console.error("fetchSerpAnalysis error:", error);
        throw error;
    }
};

export const fetchAiVisibility = async (keyword: string, config: SeoConfig): Promise<AiVisibilityData> => {
    if (config.provider === 'mock') {
        await new Promise(r => setTimeout(r, 2000));
        return {
            keyword,
            platform: 'chat_gpt',
            mentions_count: 5,
            summary: "Mock AI Summary",
            sentiment: 'neutral',
            sources: []
        };
    }

    const payload = [{
        target: keyword,
        platform: "chat_gpt",
        search_scope: "answer"
    }];

    try {
        const tasks = await dfsRequest('ai_optimization/llm_mentions/search/live', payload, config);
        const result = tasks[0]?.result[0];

        // Items array holds the data for mentions
        const items = result.items || [];
        const singular = items.length > 0 ? items[0] : {};

        return {
            keyword,
            platform: 'chat_gpt',
            mentions_count: result.mentions_count || items.length || 0,
            summary: singular.summary || result.summary || "No summary available.",
            sentiment: singular.sentiment || result.sentiment || 'neutral',

            ai_search_volume: singular.ai_search_volume,
            ai_trend_history: singular.ai_monthly_searches,
            ai_overview_text: singular.text || singular.answer,

            sources: result.llm_sources?.map((s: any) => ({
                domain: s.domain,
                url: s.url,
                title: s.title
            })) || []
        };
    } catch (e) {
        console.warn("AI Visibility endpoint failed", e);
        return {
            keyword,
            platform: 'chat_gpt',
            mentions_count: 0,
            summary: "Data unavailable or API error.",
            sentiment: 'neutral',
            sources: []
        };
    }
};

/**
 * Fetches Content Generation Data (Generation, Paraphrase, Grammar, Summary, Meta, SubTopics)
 */
export const fetchContentGeneration = async (params: ContentGenParams, config: SeoConfig): Promise<ContentGenResult> => {
    if (config.provider === 'mock') {
        await new Promise(r => setTimeout(r, 1500));
        return generateMockContentGen(params);
    }

    let endpoint = '';
    const payload: any = {};

    // --- Common Fields Handling ---
    if (params.creativity_index !== undefined) {
        payload.creativity_index = params.creativity_index;
    } else {
        // Only set advanced params if creativity_index is NOT set (mutually exclusive usually preferred)
        if (params.top_k) payload.top_k = params.top_k;
        if (params.top_p) payload.top_p = params.top_p;
        if (params.temperature) payload.temperature = params.temperature;
    }

    switch (params.mode) {
        case 'generate':
            // Generate Text (Prompt based)
            endpoint = 'content_generation/generate/live';
            payload.text = params.text;
            if (params.max_tokens) payload.max_tokens = params.max_tokens;
            if (params.avoid_words && params.avoid_words.length > 0) payload.avoid_words = params.avoid_words;
            if (params.avoid_starting_words && params.avoid_starting_words.length > 0) payload.avoid_starting_words = params.avoid_starting_words;
            break;
        case 'generate_text':
            // Generate Text (Topic based)
            endpoint = 'content_generation/generate_text/live';
            payload.topic = params.topic;
            if (params.word_count) payload.word_count = params.word_count;
            if (params.include_words && params.include_words.length > 0) payload.include_words = params.include_words;
            break;
        case 'paraphrase':
            endpoint = 'content_generation/paraphrase/live';
            payload.text = params.text;
            break;
        case 'check_grammar':
            endpoint = 'content_generation/check_grammar/live';
            payload.text = params.text;
            if (params.language_code) payload.language_code = params.language_code;
            break;
        case 'text_summary':
            endpoint = 'content_generation/text_summary/live';
            payload.text = params.text;
            break;
        case 'generate_meta_tags':
            endpoint = 'content_generation/generate_meta_tags/live';
            payload.text = params.text;
            break;
        case 'generate_sub_topics':
            endpoint = 'content_generation/generate_sub_topics/live';
            payload.topic = params.topic;
            break;
        default:
            throw new Error(`Unsupported generation mode: ${params.mode}`);
    }

    try {
        const tasks = await dfsRequest(endpoint, [payload], config);
        const result = tasks[0]?.result[0];

        if (!result) throw new Error("No result returned from API");

        // Map response based on mode
        const output: ContentGenResult = {
            generated_text: result.generated_text,
            input_tokens: result.input_tokens,
            output_tokens: result.output_tokens,
            new_tokens: result.new_tokens,
        };

        if (params.mode === 'check_grammar') {
            output.input_text = result.input_text;
            output.corrected_text = result.corrected_text;
            // Grammar errors are usually directly in the result
            output.grammar_errors = result.grammar_errors;
        }

        if (params.mode === 'text_summary') {
            output.sentences = result.sentences;
            output.paragraphs = result.paragraphs;
            output.words = result.words;
            output.readability_score = result.flesch_kincaid_reading_ease;
            output.grade_level = result.flesch_kincaid_grade_level;
            output.vocabulary_density = result.vocabulary_density;
        }

        if (params.mode === 'generate_meta_tags') {
            output.meta_title = result.meta_title;
            output.meta_description = result.meta_description;
        }

        if (params.mode === 'generate_sub_topics') {
            output.sub_topics = result.sub_topics;
        }

        return output;

    } catch (error) {
        console.error("fetchContentGeneration error:", error);
        throw error;
    }
};

// --- LEGACY SUPPORT ---
export const fetchKeywordMetrics = async (keywords: string[], config?: SeoConfig): Promise<Record<string, SeoMetrics>> => {
    if (!config) return {};
    try {
        const { overview } = await fetchKeywordData(keywords, { location_code: 2840, language_code: 'en' }, config);
        const results: Record<string, SeoMetrics> = {};

        overview.forEach(m => {
            results[m.keyword] = {
                volume: m.search_volume,
                difficulty: Math.round(m.competition * 100),
                cpc: m.cpc,
                trend: m.trend_history
            };
        });
        return results;
    } catch (e) {
        console.error("Legacy fetch failed", e);
        return {};
    }
};

// UI Utils
export const getKdColor = (kd: number): string => {
    if (kd < 30) return 'text-green-400 bg-green-900/30 border-green-800';
    if (kd < 60) return 'text-yellow-400 bg-yellow-900/30 border-yellow-800';
    return 'text-red-400 bg-red-900/30 border-red-800';
};

export const formatVolume = (num: number): string => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
};
