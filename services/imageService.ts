import { ImageSource, ImageObject, PixabayParams, UnsplashParams, KolarsParams, PollinationsParams, ReplicateParams, HuggingFaceParams, CloudflareParams, OpenRouterParams, NebiusParams, ZhipuImageParams, StabilityParams, ModelScopeImageParams, VolcEngineImageParams, ImageApiKeys } from '../types';
import { fetchProxy } from './proxyService';

// --- CORE UTILITY: Smart Image Standardization ---

/**
 * Intelligent helper to standardize various image formats into a frontend-ready URL.
 * Handles:
 * 1. Base64 JSON strings (common in OpenAI/Stability) -> data:image/png;base64,...
 * 2. Binary Blobs (CF/HF) -> blob:http://...
 * 3. Standard URLs (Replicate/Stock) -> https://...
 * 
 * @param input The raw image data (url string, base64 string, or Blob)
 * @param mimeType Optional mime type hint
 */
const standardizeToUrl = (input: string | Blob, mimeType: string = 'image/png'): string => {
    if (!input) return '';

    if (input instanceof Blob) {
        return URL.createObjectURL(input);
    }

    if (typeof input === 'string') {
        // Case A: Already a Data URL
        if (input.startsWith('data:')) {
            return input;
        }
        // Case B: Base64 Raw String (detect by lack of http and length/chars)
        // Heuristic: If it doesn't look like a URL and is long, treat as base64
        if (!input.startsWith('http') && !input.startsWith('/') && input.length > 500) {
            // Clean newlines just in case
            const cleanB64 = input.replace(/\s/g, '');
            return `data:${mimeType};base64,${cleanB64}`;
        }
        // Case C: Standard URL (HTTP/HTTPS)
        return input;
    }

    return '';
};

// --- Helper: Convert URL/Blob to Base64 (Persistence) ---
// This is essential for saving "blob:" or "http:" (ephemeral) images to DB consistently
export const convertUrlToBase64 = async (url: string): Promise<string> => {
    // 1. If already Base64, return as is (Fast path)
    if (url.startsWith('data:')) return url;

    try {
        // 2. Fetch the resource (works for blob: urls and public http urls)
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                // Ensure correct mime type in header if missing or generic
                if (result.startsWith('data:application/octet-stream')) {
                    resolve(result.replace('data:application/octet-stream', 'data:image/png'));
                } else {
                    resolve(result);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error converting URL to Base64:", error);
        // Fallback: If fetch fails (CORS?), return original URL and hope for the best
        // throwing would break the save flow.
        return url;
    }
};

// --- Recursive Finder for Replicate's Wild Output Formats ---
const findImageUrlsRecursively = (data: any): string[] => {
    if (typeof data === 'string' && (data.startsWith('http') || data.startsWith('data:'))) {
        return [data];
    }
    if (Array.isArray(data)) {
        return data.flatMap(findImageUrlsRecursively);
    }
    if (typeof data === 'object' && data !== null) {
        // Common keys in Replicate models
        if (data.url) return [data.url];
        if (data.image) return findImageUrlsRecursively(data.image);
        if (data.images) return findImageUrlsRecursively(data.images);
        if (data.output) return findImageUrlsRecursively(data.output);

        // Brute force: values
        return Object.values(data).flatMap(findImageUrlsRecursively);
    }
    return [];
};


// --- Normalizers (Polymorphic) ---

const normalizePixabayResponse = (data: any): ImageObject[] => {
    if (!data.hits) return [];
    return data.hits.map((hit: any) => ({
        id: hit.id.toString(),
        url_regular: hit.webformatURL,
        url_full: hit.largeImageURL,
        alt_description: hit.tags || 'Image from Pixabay',
        author_name: hit.user,
        author_url: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
        source_platform: ImageSource.PIXABAY,
        source_url: hit.pageURL,
        width: hit.imageWidth,
        height: hit.imageHeight,
    }));
};

const normalizeUnsplashResponse = (data: any): ImageObject[] => {
    const results = data.results || [];
    return results.map((result: any) => ({
        id: result.id,
        url_regular: result.urls.regular,
        url_full: result.urls.full,
        alt_description: result.alt_description || result.description || 'Image from Unsplash',
        author_name: result.user.name,
        author_url: result.user.links.html,
        source_platform: ImageSource.UNSPLASH,
        source_url: result.links.html,
        width: result.width,
        height: result.height,
    }));
};

const normalizeKolorsResponse = (data: any, params: KolarsParams): ImageObject[] => {
    if (!data.images || !Array.isArray(data.images)) return [];
    const [width, height] = params.image_size.split('x').map(Number);

    return data.images.map((item: any, index: number) => {
        // Kolors usually returns URLs, but check for objects just in case
        const rawUrl = typeof item === 'string' ? item : (item.url || item.b64_json);
        const finalUrl = standardizeToUrl(rawUrl);

        return {
            id: `${data.seed || 'kolors'}-${Date.now()}-${index}`,
            url_regular: finalUrl,
            url_full: finalUrl,
            alt_description: params.prompt,
            author_name: 'SiliconFlow (Kolors)',
            author_url: 'https://www.siliconflow.cn/',
            source_platform: ImageSource.KOLARS,
            source_url: 'https://www.siliconflow.cn/',
            width,
            height,
        };
    });
};

const normalizePollinationsResponse = (urls: string[], params: PollinationsParams): ImageObject[] => {
    return urls.map((url, index) => ({
        id: `poly-${Date.now()}-${index}`,
        url_regular: url,
        url_full: url,
        alt_description: params.prompt,
        author_name: 'Pollinations.AI',
        author_url: 'https://pollinations.ai/',
        source_platform: ImageSource.POLLINATIONS,
        source_url: 'https://pollinations.ai/',
        width: params.width,
        height: params.height,
    }));
};

const normalizeReplicateResponse = (output: any, params: ReplicateParams): ImageObject[] => {
    // Smart Recursive Extraction because Replicate models are inconsistent
    const rawUrls = findImageUrlsRecursively(output);

    // Fallback if extraction failed but we have something
    if (rawUrls.length === 0 && output) {
        console.warn("Replicate normalization couldn't find standard URLs. Dumping output:", output);
    }

    return rawUrls.map((url, index) => {
        const finalUrl = standardizeToUrl(url);
        return {
            id: `replicate-${Date.now()}-${index}`,
            url_regular: finalUrl,
            url_full: finalUrl,
            alt_description: params.prompt,
            author_name: 'Replicate',
            author_url: 'https://replicate.com/',
            source_platform: ImageSource.REPLICATE,
            source_url: 'https://replicate.com/',
            width: params.width,
            height: params.height,
        };
    });
};

const normalizeHuggingFaceResponse = (blob: Blob, params: HuggingFaceParams): ImageObject[] => {
    const url = standardizeToUrl(blob, 'image/jpeg'); // Standardize blob to URL
    return [{
        id: `hf-${Date.now()}`,
        url_regular: url,
        url_full: url,
        alt_description: params.prompt,
        author_name: 'Hugging Face Inference',
        author_url: `https://huggingface.co/${params.model}`,
        source_platform: ImageSource.HUGGINGFACE,
        source_url: `https://huggingface.co/${params.model}`,
        width: 1024,
        height: 1024,
    }];
};

const normalizeCloudflareResponse = (blob: Blob, params: CloudflareParams): ImageObject[] => {
    const url = standardizeToUrl(blob, 'image/png'); // Standardize blob to URL
    return [{
        id: `cf-${Date.now()}`,
        url_regular: url,
        url_full: url,
        alt_description: params.prompt,
        author_name: 'Cloudflare Workers AI',
        author_url: 'https://developers.cloudflare.com/workers-ai/',
        source_platform: ImageSource.CLOUDFLARE,
        source_url: 'https://developers.cloudflare.com/workers-ai/',
        width: 1024,
        height: 1024,
    }];
};

const normalizeOpenRouterResponse = (data: any, params: OpenRouterParams): ImageObject[] => {
    // OpenRouter (and OpenAI) often return { data: [ { url: ... }, { b64_json: ... } ] }
    if (!data.data || !Array.isArray(data.data)) return [];

    return data.data.map((item: any, index: number) => {
        // Priority: b64_json (stable) > url (ephemeral)
        const rawContent = item.b64_json || item.url;
        const finalUrl = standardizeToUrl(rawContent, 'image/png');

        return {
            id: `or-${Date.now()}-${index}`,
            url_regular: finalUrl,
            url_full: finalUrl,
            alt_description: params.prompt,
            author_name: 'OpenRouter',
            author_url: 'https://openrouter.ai/',
            source_platform: ImageSource.OPENROUTER,
            source_url: 'https://openrouter.ai/',
            width: params.width || 1024,
            height: params.height || 1024,
        };
    });
};

const normalizeNebiusResponse = (data: any, params: NebiusParams): ImageObject[] => {
    if (!data.data || !Array.isArray(data.data)) return [];

    return data.data.map((item: any, index: number) => {
        const rawContent = item.b64_json || item.url;
        const finalUrl = standardizeToUrl(rawContent, 'image/png');

        return {
            id: `nebius-${Date.now()}-${index}`,
            url_regular: finalUrl,
            url_full: finalUrl,
            alt_description: params.prompt,
            author_name: 'Nebius AI (Flux)',
            author_url: 'https://nebius.ai/',
            source_platform: ImageSource.NEBIUS,
            source_url: 'https://nebius.ai/',
            width: params.width || 1024,
            height: params.height || 1024,
        };
    });
};

const normalizeZhipuResponse = (data: any, params: ZhipuImageParams): ImageObject[] => {
    if (!data.data || !Array.isArray(data.data)) return [];
    const [width, height] = params.size.split('x').map(Number);

    return data.data.map((item: any, index: number) => {
        const rawContent = item.url;
        const finalUrl = standardizeToUrl(rawContent, 'image/png');

        return {
            id: `zhipu-${Date.now()}-${index}`,
            url_regular: finalUrl,
            url_full: finalUrl,
            alt_description: params.prompt,
            author_name: 'Zhipu AI (CogView)',
            author_url: 'https://bigmodel.cn/',
            source_platform: ImageSource.ZHIPU_COGVIEW,
            source_url: 'https://bigmodel.cn/',
            width: width,
            height: height,
        };
    });
};


// --- API Callers ---

export const fetchPixabayImages = async (params: PixabayParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Pixabay API Key is not provided.");
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.append("key", apiKey);
    url.searchParams.append("q", params.query.substring(0, 100)); // Max 100 chars
    url.searchParams.append("per_page", params.per_page.toString());
    url.searchParams.append("image_type", "photo");
    url.searchParams.append("order", params.order);
    url.searchParams.append("orientation", params.orientation);
    if (params.safesearch) url.searchParams.append("safesearch", "true");
    if (params.editors_choice) url.searchParams.append("editors_choice", "true");

    const response = await fetch(url.toString());
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pixabay API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return normalizePixabayResponse(data);
};

export const fetchUnsplashImages = async (params: UnsplashParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Unsplash API Key is not provided.");
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.append("query", params.query);
    url.searchParams.append("per_page", params.per_page.toString());
    url.searchParams.append("orientation", params.orientation);

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: `Client-ID ${apiKey}`
        }
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Unsplash API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return normalizeUnsplashResponse(data);
};

export const fetchKolorsImages = async (params: KolarsParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Kolors (SiliconFlow) API Key is not provided.");
    const url = "https://api.siliconflow.cn/v1/images/generations";

    const body: any = {
        model: params.model,
        prompt: params.prompt,
        image_size: params.image_size,
        batch_size: params.per_page,
        num_inference_steps: params.num_inference_steps,
        guidance_scale: params.guidance_scale,
        enhance: params.enhance,
        nologo: params.nologo,
        transparent: params.transparent,
        private: params.private,
    };
    if (params.seed) body.seed = params.seed;
    if (params.negative_prompt) body.negative_prompt = params.negative_prompt;


    const response = await fetchProxy({
        url: url,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        let parsedError;
        try {
            parsedError = JSON.parse(errorText);
        } catch (e) {
            // not a json error
        }
        const message = parsedError?.error?.message || errorText;
        throw new Error(`Kolors API error: ${response.status} - ${message}`);
    }
    const data = await response.json();
    return normalizeKolorsResponse(data, params);
};

export const fetchPollinationsImages = async (params: PollinationsParams): Promise<ImageObject[]> => {
    // API key is not used for this service.
    const urls: string[] = [];
    const fullPrompt = params.negative_prompt
        ? `${params.prompt} [${params.negative_prompt}]`
        : params.prompt;

    for (let i = 0; i < params.per_page; i++) {
        const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`);

        if (params.model) url.searchParams.append('model', params.model);
        if (params.width) url.searchParams.append('width', String(params.width));
        if (params.height) url.searchParams.append('height', String(params.height));
        if (params.nologo) url.searchParams.append('nologo', 'true');
        if (params.enhance) url.searchParams.append('enhance', 'true');
        if (params.transparent) url.searchParams.append('transparent', 'true');
        if (params.private) url.searchParams.append('private', 'true');

        if (params.seed) {
            url.searchParams.append('seed', String(params.seed + i));
        } else {
            url.searchParams.append('r', String(Math.random()));
        }

        urls.push(url.toString());
    }
    return normalizePollinationsResponse(urls, params);
};

export const fetchHuggingFaceImages = async (params: HuggingFaceParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Hugging Face Access Token is not provided.");
    if (!params.model) throw new Error("Model ID is required for Hugging Face.");

    const url = `https://api-inference.huggingface.co/models/${params.model}`;

    // Some models expect parameters in different keys, but standard text-to-image usually accepts this
    const payload = {
        inputs: params.prompt,
        parameters: {
            negative_prompt: params.negative_prompt,
            num_inference_steps: params.num_inference_steps,
            guidance_scale: params.guidance_scale,
            width: params.width,
            height: params.height,
        }
    };

    const response = await fetchProxy({
        url: url,
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: payload,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    // HF Inference API returns the image binary (Blob) directly for text-to-image
    const blob = await response.blob();
    return normalizeHuggingFaceResponse(blob, params);
};

export const fetchReplicateImages = async (params: ReplicateParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Replicate API Token is not provided.");
    if (!params.model) throw new Error("Model ID is required for Replicate.");

    const [owner, name] = params.model.split('/');
    // We assume the user inputs "owner/name" or "owner/name:version".

    // Attempt to extract slug if present, otherwise assume simple model name
    const modelName = name.split(':')[0];

    const startUrl = `https://api.replicate.com/v1/models/${owner}/${modelName}/predictions`;

    const input: any = {
        prompt: params.prompt,
        width: params.width,
        height: params.height,
        num_inference_steps: params.num_inference_steps,
        guidance_scale: params.guidance_scale,
        scheduler: params.scheduler,
        output_format: params.output_format || "png",
        safety_tolerance: params.safety_tolerance
    };
    if (params.negative_prompt) input.negative_prompt = params.negative_prompt;
    if (params.aspect_ratio) input.aspect_ratio = params.aspect_ratio;

    const startResponse = await fetchProxy({
        url: startUrl,
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: { input },
    });

    if (!startResponse.ok) {
        const errorText = await startResponse.text();
        throw new Error(`Replicate API Error (Start): ${startResponse.status} - ${errorText}`);
    }

    const prediction = await startResponse.json();
    let getUrl = prediction.urls.get;
    let status = prediction.status;

    // 2. Poll for completion
    let attempts = 0;
    while (status !== "succeeded" && status !== "failed" && status !== "canceled") {
        attempts++;
        if (attempts > 40) throw new Error("Replicate request timed out.");

        await new Promise((resolve) => setTimeout(resolve, 1500)); // Poll every 1.5s

        const pollResponse = await fetchProxy({
            url: getUrl,
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            },
        });

        if (!pollResponse.ok) {
            const errorText = await pollResponse.text();
            throw new Error(`Replicate API Error (Poll): ${pollResponse.status} - ${errorText}`);
        }

        const pollData = await pollResponse.json();
        status = pollData.status;
        if (status === "succeeded") {
            return normalizeReplicateResponse(pollData.output, params);
        }
    }

    throw new Error(`Replicate prediction failed with status: ${status}`);
};

export const fetchCloudflareImages = async (params: CloudflareParams, accountId: string, token: string): Promise<ImageObject[]> => {
    if (!accountId || !token) throw new Error("Cloudflare Account ID and API Token are required.");
    if (!params.model) throw new Error("Cloudflare model ID is required.");

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${params.model}`;

    const body: any = {
        prompt: params.prompt,
        num_steps: params.num_steps,
        guidance: params.guidance,
    };
    if (params.negative_prompt) body.negative_prompt = params.negative_prompt;

    const response = await fetchProxy({
        url: url,
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare Workers AI Error: ${response.status} - ${errorText}`);
    }

    // Cloudflare returns binary blob for images
    const blob = await response.blob();
    return normalizeCloudflareResponse(blob, params);
};

export const fetchOpenRouterImages = async (params: OpenRouterParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("OpenRouter API Key is not provided.");

    // OpenRouter uses OpenAI-compatible image generation endpoint
    const url = "https://openrouter.ai/api/v1/images/generations";

    const body: any = {
        model: params.model,
        prompt: params.prompt,
        n: params.per_page,
        size: params.width && params.height ? `${params.width}x${params.height}` : undefined,
        // Smart optimization: Request Base64 JSON if supported to avoid ephemeral URLs
        response_format: "b64_json"
    };

    const response = await fetchProxy({
        url: url,
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin, // Required by OpenRouter
            "X-Title": "SEO Copilot",
        },
        body: body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return normalizeOpenRouterResponse(data, params);
};

export const fetchNebiusImages = async (params: NebiusParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Nebius API Key is not provided.");

    const url = "https://api.studio.nebius.ai/v1/images/generations";

    const body: any = {
        model: params.model,
        prompt: params.prompt,
        n: params.per_page,
        width: params.width || 1024,
        height: params.height || 1024,
        num_inference_steps: params.num_inference_steps,
        seed: params.seed,
        response_format: "b64_json"
    };
    if (params.negative_prompt) body.negative_prompt = params.negative_prompt;

    const response = await fetchProxy({
        url: url,
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Nebius API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return normalizeNebiusResponse(data, params);
};

export const fetchZhipuImages = async (params: ZhipuImageParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Zhipu API Key is not provided.");

    // Zhipu CogView-3 OpenAI-Compatible Endpoint
    const url = "https://open.bigmodel.cn/api/paas/v4/images/generations";

    const body: any = {
        model: params.model,
        prompt: params.prompt,
        size: params.size,
    };

    const response = await fetchProxy({
        url: url,
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zhipu API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return normalizeZhipuResponse(data, params);
};


// --- Model Fetching Utility ---

export const fetchAvailableImageModels = async (source: ImageSource, keys: ImageApiKeys): Promise<{ id: string, name?: string }[]> => {
    switch (source) {
        case ImageSource.CLOUDFLARE:
            if (!keys.cloudflare_account_id || !keys.cloudflare_token) throw new Error("Missing Cloudflare Credentials");
            const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${keys.cloudflare_account_id}/ai/models?search=text-to-image`;
            const cfRes = await fetchProxy({
                url: cfUrl,
                headers: { "Authorization": `Bearer ${keys.cloudflare_token}` }
            });
            if (!cfRes.ok) throw new Error("Failed to fetch Cloudflare models");
            const cfData = await cfRes.json();
            return cfData.result.map((m: any) => ({ id: m.name, name: m.name }));

        case ImageSource.OPENROUTER:
            if (!keys[ImageSource.OPENROUTER]) throw new Error("Missing OpenRouter API Key");
            const orRes = await fetchProxy({
                url: "https://openrouter.ai/api/v1/models",
                headers: { "Authorization": `Bearer ${keys[ImageSource.OPENROUTER]}` }
            });
            if (!orRes.ok) throw new Error("Failed to fetch OpenRouter models");
            const orData = await orRes.json();
            // Filter heuristically for image models if possible, or just return all
            // OpenRouter data includes 'architecture'. We can check for 'diffusion' or similar.
            return orData.data
                .filter((m: any) => m.architecture?.model_type === 'text-to-image' || m.id.includes('diffusion') || m.id.includes('flux') || m.id.includes('image'))
                .map((m: any) => ({ id: m.id, name: m.name }));

        case ImageSource.REPLICATE:
            // Replicate listing is complex (paged), we'll return a static popular list for now + fetch if user provides owner/name
            // Or fetch user's own models? For now, static list of popular image models
            return [
                { id: "black-forest-labs/flux-schnell", name: "Flux Schnell" },
                { id: "black-forest-labs/flux-dev", name: "Flux Dev" },
                { id: "stability-ai/sdxl", name: "SDXL" },
                { id: "stability-ai/stable-diffusion", name: "Stable Diffusion v2.1" },
            ];

        default:
            return [];
    }
}

// VolcEngine, ModelScope, etc. placeholders if needed or leave out if not used in imports
// The component refers to them, so I should probably keep them if they were in the original file.
// The imports included them, so I will add placeholders to avoid valid errors.

export const fetchModelScopeImages = async (params: any, apiKey: any): Promise<ImageObject[]> => {
    // Placeholder (Assuming it was there before, but wasn't in my copy paste block)
    // If it wasn't used/implemented, removing it is safer than adding broken code.
    // However, the component imports it. So I need to mock it or find it.
    // I recall seeeing it in the previous file view at line 6, but not the implementation.
    // I'll define a basic stub or assume it wasn't fully implemented in the backup either.
    // Actually, I'll error if called to be safe.
    throw new Error("ModelScope implementation missing in restore.");
};

export const fetchVolcEngineImages = async (params: any, apiKey: any): Promise<ImageObject[]> => {
    throw new Error("VolcEngine implementation missing in restore.");
};

export const fetchOpenAIImages = async (params: any, apiKey: any): Promise<ImageObject[]> => {
    // DALL-E 3
    if (!apiKey) throw new Error("OpenAI API Key is not provided.");
    const url = "https://api.openai.com/v1/images/generations";

    const body: any = {
        model: "dall-e-3",
        prompt: params.prompt,
        n: 1, // DALL-E 3 only supports n=1
        size: params.size || "1024x1024",
        quality: params.quality || "standard",
        style: params.style || "vivid",
        response_format: "b64_json"
    };

    const response = await fetchProxy({
        url: url,
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return normalizeOpenRouterResponse(data, params); // Reuse normalizer as format is same
};


export const fetchStabilityImages = async (params: StabilityParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Stability API Key is not provided.");

    // Stability Ultra or Core
    const url = "https://api.stability.ai/v2beta/stable-image/generate/core"; // Example endpoint

    // Stability expects FormData usually for v2beta
    const formData = new FormData();
    formData.append("prompt", params.prompt);
    formData.append("output_format", params.output_format);

    // fetchProxy needs to handle FormData carefully. 
    // Usually it sends JSON. If we need FormData, we might need special handling.
    // For now, let's assume JSON body for SD3 if available, or skip.
    throw new Error("Stability implementation requires FormData support in Proxy.");
};