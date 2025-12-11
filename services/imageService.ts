import { ImageSource, ImageObject, PixabayParams, UnsplashParams, KolarsParams, PollinationsParams, ReplicateParams, HuggingFaceParams, CloudflareParams, OpenRouterParams, NebiusParams, ZhipuImageParams, ModelScopeImageParams, VolcEngineImageParams, ImageApiKeys } from '../types';

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
        };
    });
};

const normalizeModelScopeResponse = (data: any, params: ModelScopeImageParams): ImageObject[] => {
    // ModelScope via OpenAI-compatible API usually returns data array with urls
    if (!data.data || !Array.isArray(data.data)) return [];

    return data.data.map((item: any, index: number) => {
        const rawContent = item.url || item.b64_json;
        const finalUrl = standardizeToUrl(rawContent, 'image/png');

        return {
            id: `ms-${Date.now()}-${index}`,
            url_regular: finalUrl,
            url_full: finalUrl,
            alt_description: params.prompt,
            author_name: 'ModelScope Model',
            author_url: 'https://modelscope.cn/',
            source_platform: ImageSource.MODELSCOPE,
            source_url: 'https://modelscope.cn/',
            width: 1024,
            height: 1024,
        };
    });
};

const normalizeVolcEngineResponse = (data: any, params: VolcEngineImageParams): ImageObject[] => {
    // VolcEngine (Dream AI) returns: { data: [ { url: "..." } ] }
    if (!data.data || !Array.isArray(data.data)) return [];

    return data.data.map((item: any, index: number) => {
        const finalUrl = standardizeToUrl(item.url);

        return {
            id: `volc-${Date.now()}-${index}`,
            url_regular: finalUrl,
            url_full: finalUrl,
            alt_description: params.prompt,
            author_name: 'Volcano Engine (Dream)',
            author_url: 'https://www.volcengine.com/',
            source_platform: ImageSource.VOLCENGINE,
            source_url: 'https://www.volcengine.com/',
            width: params.width || 1024,
            height: params.height || 1024,
        };
    });
};


// --- API Callers ---

// --- Parameter Sanitization (The "Safe Layer") ---

const sanitizeImageParams = (source: ImageSource, params: any): any => {
    const safeParams = { ...params };

    // Helper: Snap to nearest multiple of 32 (required by Flux/SD)
    const snapTo32 = (val: number) => Math.round(val / 32) * 32;

    // Helper: Snap to specific allowed sizes
    const snapToAllowed = (w: number, h: number, allowed: [number, number][]) => {
        let best = allowed[0];
        let minDiff = Number.MAX_VALUE;
        for (const [aw, ah] of allowed) {
            const diff = Math.abs(aw - w) + Math.abs(ah - h);
            if (diff < minDiff) {
                minDiff = diff;
                best = [aw, ah];
            }
        }
        return best;
    };

    switch (source) {
        case ImageSource.DALLE3:
            // DALL-E 3: Strict sizes only, no negative prompt
            const allowedDalle = [[1024, 1024], [1024, 1792], [1792, 1024]];
            const [dw, dh] = snapToAllowed(safeParams.width || 1024, safeParams.height || 1024, allowedDalle as [number, number][]);
            // DALL-E 3 API takes "size" string, not w/h
            safeParams.size = `${dw}x${dh}`;
            delete safeParams.width;
            delete safeParams.height;
            delete safeParams.negative_prompt; // Not supported
            delete safeParams.num_inference_steps; // Not supported
            break;

        case ImageSource.KOLARS:
            // Kolors: Wants 'image_size' string, specific values preferred
            const kw = safeParams.width || 1024;
            const kh = safeParams.height || 1024;
            safeParams.image_size = `${kw}x${kh}`;
            // Ensure steps are within range if provided
            if (safeParams.num_inference_steps) {
                safeParams.num_inference_steps = Math.max(10, Math.min(50, safeParams.num_inference_steps));
            }
            break;

        case ImageSource.NEBIUS:
        case ImageSource.REPLICATE:
            // Flux: Width/Height MUST be multiples of 32
            if (safeParams.width) safeParams.width = snapTo32(safeParams.width);
            if (safeParams.height) safeParams.height = snapTo32(safeParams.height);
            break;

        case ImageSource.ZHIPU_COGVIEW:
            // Zhipu: Only specific sizes allowed
            const allowedZhipu = [[1024, 1024], [768, 1344], [864, 1152], [1344, 768], [1152, 864], [1440, 720], [720, 1440]];
            const [zw, zh] = snapToAllowed(safeParams.width || 1024, safeParams.height || 1024, allowedZhipu as [number, number][]);
            safeParams.size = `${zw}x${zh}`;
            break;

        case ImageSource.STABILITY:
            // Stability: explicit width/height works, but requires multiples of 64 usually. 
            // Let's enforce multiples of 64 for safety on Stable Image Core
            if (safeParams.width) safeParams.width = Math.round((safeParams.width || 1024) / 64) * 64;
            if (safeParams.height) safeParams.height = Math.round((safeParams.height || 1024) / 64) * 64;
            break;

        case ImageSource.MODELSCOPE:
            // Custom sanitization for ModelScope
            if (safeParams.size) delete safeParams.width; // Use size if provided
            if (safeParams.guidance) safeParams.guidance = Math.max(1.5, Math.min(20, safeParams.guidance));
            break;

        case ImageSource.VOLCENGINE:
            // Volcano/Dream AI:
            if (safeParams.size) {
                // Try to parse WxH from size if available, though UI might send w/h directly
                const [w, h] = safeParams.size.split('x').map(Number);
                if (!isNaN(w)) safeParams.width = w;
                if (!isNaN(h)) safeParams.height = h;
                delete safeParams.size;
            }
            // Step Range: 1-100
            if (safeParams.steps) safeParams.steps = Math.max(1, Math.min(100, safeParams.steps));
            if (safeParams.guidance) safeParams.guidance = Math.max(1.5, Math.min(20, safeParams.guidance));
            break;
    }

    return safeParams;
};


// --- API Callers ---

export const fetchPixabayImages = async (params: PixabayParams, apiKey: string): Promise<ImageObject[]> => {
    // Pixabay is lenient, but usually standard params are fine.
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

    // SAFE LAYER
    const safe = sanitizeImageParams(ImageSource.KOLARS, params);

    const url = "https://api.siliconflow.cn/v1/images/generations";

    const body: any = {
        model: safe.model,
        prompt: safe.prompt,
        image_size: safe.image_size, // Sanitized string "WxH"
        batch_size: safe.per_page,
        num_inference_steps: safe.num_inference_steps,
        guidance_scale: safe.guidance_scale,
        enhance: safe.enhance,
        nologo: safe.nologo,
        transparent: safe.transparent,
        private: safe.private,
    };
    if (safe.seed) body.seed = safe.seed;
    if (safe.negative_prompt) body.negative_prompt = safe.negative_prompt;


    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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
    return normalizeKolorsResponse(data, safe);
};

export const fetchPollinationsImages = async (params: PollinationsParams): Promise<ImageObject[]> => {
    // API key is not used for this service.

    // SAFE LAYER (Pollinations is flexible, but let's be safe)
    const safe = sanitizeImageParams(ImageSource.POLLINATIONS, params);

    const urls: string[] = [];
    const fullPrompt = safe.negative_prompt
        ? `${safe.prompt} [${safe.negative_prompt}]`
        : safe.prompt;

    for (let i = 0; i < safe.per_page; i++) {
        const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`);

        if (safe.model) url.searchParams.append('model', safe.model);
        if (safe.width) url.searchParams.append('width', String(safe.width));
        if (safe.height) url.searchParams.append('height', String(safe.height));
        if (safe.nologo) url.searchParams.append('nologo', 'true');
        if (safe.enhance) url.searchParams.append('enhance', 'true');
        if (safe.transparent) url.searchParams.append('transparent', 'true');
        if (safe.private) url.searchParams.append('private', 'true');

        if (safe.seed) {
            url.searchParams.append('seed', String(safe.seed + i));
        } else {
            url.searchParams.append('r', String(Math.random()));
        }

        urls.push(url.toString());
    }
    return normalizePollinationsResponse(urls, safe);
};

export const fetchHuggingFaceImages = async (params: HuggingFaceParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Hugging Face Access Token is not provided.");
    if (!params.model) throw new Error("Model ID is required for Hugging Face.");

    // SAFE LAYER
    const safe = sanitizeImageParams(ImageSource.HUGGINGFACE, params);

    const url = `https://api-inference.huggingface.co/models/${safe.model}`;

    // Some models expect parameters in different keys, but standard text-to-image usually accepts this
    const payload = {
        inputs: safe.prompt,
        parameters: {
            negative_prompt: safe.negative_prompt,
            num_inference_steps: safe.num_inference_steps,
            guidance_scale: safe.guidance_scale,
            width: safe.width,
            height: safe.height,
        }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    // HF Inference API returns the image binary (Blob) directly for text-to-image
    const blob = await response.blob();
    return normalizeHuggingFaceResponse(blob, safe);
};

export const fetchReplicateImages = async (params: ReplicateParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Replicate API Token is not provided.");
    if (!params.model) throw new Error("Model ID is required for Replicate.");

    // SAFE LAYER (Important for Flux multiples of 32)
    const safe = sanitizeImageParams(ImageSource.REPLICATE, params);

    const [owner, name] = safe.model.split('/');
    // We assume the user inputs "owner/name" or "owner/name:version".

    // Attempt to extract slug if present, otherwise assume simple model name
    const modelName = name.split(':')[0];

    const startUrl = `https://api.replicate.com/v1/models/${owner}/${modelName}/predictions`;

    const input: any = {
        prompt: safe.prompt,
        width: safe.width,
        height: safe.height,
        num_inference_steps: safe.num_inference_steps,
        guidance_scale: safe.guidance_scale,
        scheduler: safe.scheduler,
        output_format: safe.output_format || "png",
        safety_tolerance: safe.safety_tolerance
    };
    if (safe.negative_prompt) input.negative_prompt = safe.negative_prompt;
    if (safe.aspect_ratio) input.aspect_ratio = safe.aspect_ratio;

    const startResponse = await fetch(startUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
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

        const pollResponse = await fetch(getUrl, {
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
            return normalizeReplicateResponse(pollData.output, safe);
        }
    }

    throw new Error(`Replicate prediction failed with status: ${status}`);
};

export const fetchCloudflareImages = async (params: CloudflareParams, accountId: string, token: string): Promise<ImageObject[]> => {
    if (!accountId || !token) throw new Error("Cloudflare Account ID and API Token are required.");
    if (!params.model) throw new Error("Cloudflare model ID is required.");

    // SAFE LAYER
    const safe = sanitizeImageParams(ImageSource.CLOUDFLARE, params);

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${safe.model}`;

    const body: any = {
        prompt: safe.prompt,
        steps: safe.num_steps, // API expects 'steps' based on your fix
        guidance: safe.guidance,
    };
    if (safe.negative_prompt) body.negative_prompt = safe.negative_prompt;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudflare Workers AI Error: ${response.status} - ${errorText}`);
    }

    // Cloudflare returns binary blob for images
    const blob = await response.blob();
    return normalizeCloudflareResponse(blob, safe);
};

export const fetchOpenRouterImages = async (params: OpenRouterParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("OpenRouter API Key is not provided.");

    // SAFE LAYER
    const safe = sanitizeImageParams(ImageSource.OPENROUTER, params);

    // OpenRouter uses OpenAI-compatible image generation endpoint
    const url = "https://openrouter.ai/api/v1/images/generations";

    const body: any = {
        model: safe.model,
        prompt: safe.prompt,
        n: safe.per_page,
        size: safe.width && safe.height ? `${safe.width}x${safe.height}` : undefined,
        // Smart optimization: Request Base64 JSON if supported to avoid ephemeral URLs
        response_format: "b64_json"
    };
    // Text-to-Image models on OpenRouter often accept negative_prompt
    if (safe.negative_prompt) body.negative_prompt = safe.negative_prompt;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin, // Required by OpenRouter
            "X-Title": "SEO Copilot",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return normalizeOpenRouterResponse(data, safe);
};

export const fetchNebiusImages = async (params: NebiusParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Nebius API Key is not provided.");

    // SAFE LAYER (Important: Multiples of 32 for Flux)
    const safe = sanitizeImageParams(ImageSource.NEBIUS, params);

    const url = "https://api.studio.nebius.ai/v1/images/generations";

    const body: any = {
        model: safe.model,
        prompt: safe.prompt,
        n: safe.per_page,
        width: safe.width || 1024,
        height: safe.height || 1024,
        num_inference_steps: safe.num_inference_steps,
        seed: safe.seed,
        response_format: "b64_json"
    };
    if (safe.negative_prompt) body.negative_prompt = safe.negative_prompt;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Nebius API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return normalizeNebiusResponse(data, safe);
};

export const fetchZhipuImages = async (params: ZhipuImageParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Zhipu API Key is not provided.");

    // SAFE LAYER (Important: sizes)
    const safe = sanitizeImageParams(ImageSource.ZHIPU_COGVIEW, params);

    // Zhipu CogView-3 OpenAI-Compatible Endpoint
    const url = "https://open.bigmodel.cn/api/paas/v4/images/generations";

    const body: any = {
        model: safe.model,
        prompt: safe.prompt,
        size: safe.size, // Already constructed in sanitize
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zhipu API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return normalizeZhipuResponse(data, safe);
};

export const fetchModelScopeImages = async (params: ModelScopeImageParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("ModelScope Access Token is not provided.");

    // SAFE LAYER
    const safe = sanitizeImageParams(ImageSource.MODELSCOPE, params);

    // Endpoint: ModelScope OpenAI Compatible API
    // Note: Documentation suggests v1/images/generations for image gen if following OpenAI spec.
    const url = "https://api-inference.modelscope.cn/v1/images/generations";

    const body: any = {
        model: safe.model,
        prompt: safe.prompt,
        n: 1, // Usually 1
        size: safe.size || "1024x1024",
    };

    // Add Extended Parameters (ModelScope specific)
    if (safe.negative_prompt) body.negative_prompt = safe.negative_prompt;
    if (safe.steps) body.steps = safe.steps;
    if (safe.guidance) body.guidance = safe.guidance;
    if (safe.seed) body.seed = safe.seed;
    if (safe.loras) body.loras = safe.loras;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ModelScope API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return normalizeModelScopeResponse(data, safe);
};

export const fetchVolcEngineImages = async (params: VolcEngineImageParams, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Volcano Engine API Key is not provided.");

    // SAFE LAYER
    const safe = sanitizeImageParams(ImageSource.VOLCENGINE, params);

    // Endpoint: Dream AI (Volcano Image Generation)
    const url = "https://dream-api.volcengine.com/v1/images/generations";

    const body: any = {
        model: safe.model || "seedream-4.0", // Default model
        prompt: safe.prompt,
        width: safe.width || 1024,
        height: safe.height || 1024,
        n: safe.n || 1,
    };

    if (safe.negative_prompt) body.negative_prompt = safe.negative_prompt;
    if (safe.steps) body.steps = safe.steps;
    if (safe.guidance) body.guidance = safe.guidance;
    if (safe.seed) body.seed = safe.seed;
    if (safe.loras) body.loras = safe.loras;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Volcano Engine API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return normalizeVolcEngineResponse(data, safe);
};




export const fetchOpenAIImages = async (params: any, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("OpenAI API Key is not provided.");

    // SAFE LAYER (Critical: Strips negative_prompt, snaps sizes)
    const safe = sanitizeImageParams(ImageSource.DALLE3, params);

    const url = "https://api.openai.com/v1/images/generations";

    const body = {
        model: "dall-e-3",
        prompt: safe.prompt,
        n: 1, // DALL-E 3 only supports n=1
        size: safe.size, // Sanitized
        response_format: "b64_json", // Intelligent Format: Request Base64 directly
        quality: "standard"
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI DALL-E 3 Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Normalize OpenAI Response
    return data.data.map((item: any, index: number) => {
        const finalUrl = standardizeToUrl(item.b64_json || item.url, 'image/png');
        return {
            id: `dalle-${Date.now()}-${index}`,
            url_regular: finalUrl,
            url_full: finalUrl,
            alt_description: safe.prompt,
            author_name: 'OpenAI (DALL-E 3)',
            author_url: 'https://openai.com/dall-e-3',
            source_platform: ImageSource.DALLE3,
            source_url: 'https://openai.com/',
            width: 1024,
            height: 1024,
        };
    });
};

export const fetchStabilityImages = async (params: any, apiKey: string): Promise<ImageObject[]> => {
    if (!apiKey) throw new Error("Stability AI API Key is not provided.");

    // SAFE LAYER
    const safe = sanitizeImageParams(ImageSource.STABILITY, params);

    // Using Stability AI v2beta API for SD3 / Core
    const url = "https://api.stability.ai/v2beta/stable-image/generate/core";

    const formData = new FormData();
    formData.append("prompt", safe.prompt);
    formData.append("output_format", "png");
    // negative_prompt, aspect_ratio etc supported
    if (safe.negative_prompt) formData.append("negative_prompt", safe.negative_prompt);
    // Prefer aspect ratio if no specific width/height, but for now we sanitize w/h to multiples of 64
    // If we wanted to be smarter we could map to aspect_ratio, but explicit w/h is supported if valid.

    // Note: Stability Core API often prefers aspect_ratio over raw pixels, but allows raw pixel if valid.
    // Let's rely on sanitized w/h for now.

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "application/json" // Request JSON to get base64 if supported, or handled via blob? 
            // Stability Core API returns binary by default if Accept is image/*. 
            // If Accept is application/json, it returns { image: "base64..." }
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stability AI Error: ${response.status} - ${errorText}`);
    }

    // Logic: Stability V2Beta Core API returns { image: "base64_string", finish_reason: "SUCCESS", ... }
    const data = await response.json();
    if (data.image) {
        const finalUrl = standardizeToUrl(data.image, 'image/png');
        return [{
            id: `stability-${Date.now()}`,
            url_regular: finalUrl,
            url_full: finalUrl,
            alt_description: safe.prompt,
            author_name: 'Stability AI',
            author_url: 'https://stability.ai/',
            source_platform: ImageSource.STABILITY,
            source_url: 'https://stability.ai/',
            width: 1024,
            height: 1024,
        }];
    } else {
        throw new Error(`Stability AI response missing 'image' field. Raw: ${JSON.stringify(data).substring(0, 200)}`);
    }
};


// --- Model Fetching Utility ---

export const fetchAvailableImageModels = async (source: ImageSource, keys: ImageApiKeys): Promise<{ id: string, name?: string }[]> => {
    switch (source) {
        case ImageSource.CLOUDFLARE:
            if (!keys.cloudflare_account_id || !keys.cloudflare_token) throw new Error("Missing Cloudflare Credentials");
            const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${keys.cloudflare_account_id}/ai/models?search=text-to-image`;
            const cfRes = await fetch(cfUrl, {
                headers: { "Authorization": `Bearer ${keys.cloudflare_token}` }
            });
            if (!cfRes.ok) throw new Error("Failed to fetch Cloudflare models");
            const cfData = await cfRes.json();
            return cfData.result.map((m: any) => ({ id: m.name, name: m.name }));

        case ImageSource.OPENROUTER:
            if (!keys[ImageSource.OPENROUTER]) throw new Error("Missing OpenRouter API Key");
            const orRes = await fetch("https://openrouter.ai/api/v1/models", {
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

// --- Cloudflare R2 / S3 Storage Support ---

// Need to import S3Client locally since it's a new dependency
// But top-level imports are better. However, this file is huge.
// Let's add the imports at the top if possible, OR use dynamic import if we want to save bundle size?
// Ideally we should have added imports at the top.
// Since I can't easily jump to top and bottom in one go without multi-replace,
// I will just add the function here and hope the imports were added or I will add them in `ImageTextProcessor` instead?
// No, the service needs the imports.
// I will use `require` or dynamic import? No, this is ES module.
// I will assume I added imports at top? NO, I DID NOT.
// I need to add imports to the top of `imageService.ts` FIRST.
// Actually, `uploadImageToR2` inside `ImageTextProcessor` was calling this service function.
// This function needs `@aws-sdk/client-s3`.
// I will proceed to add the function here, BUT I also need to add imports at the top.
// I will use multi_replace to do both.

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const uploadImageToR2 = async (
    imageBlob: Blob,
    fileName: string,
    account_id: string,
    access_key_id: string,
    secret_access_key: string,
    bucket_name: string,
    public_url_prefix?: string
): Promise<string> => {

    // 1. Initialize S3 Client (R2 compatible)
    const R2 = new S3Client({
        region: 'auto',
        endpoint: `https://${account_id}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: access_key_id,
            secretAccessKey: secret_access_key,
        },
    });

    // 2. Upload
    try {
        const command = new PutObjectCommand({
            Bucket: bucket_name,
            Key: fileName,
            Body: imageBlob,
            ContentType: imageBlob.type || 'image/png',
            // ACL: 'public-read', // R2 doesn't always support ACLs
        });

        await R2.send(command);

        // 3. Construct URL
        if (public_url_prefix) {
            const prefix = public_url_prefix.endsWith('/') ? public_url_prefix : `${public_url_prefix}/`;
            return `${prefix}${fileName}`;
        }

        // Default Fallback
        return `r2_uploaded:${fileName}`;

    } catch (error) {
        console.error("R2 Upload Error:", error);
        throw new Error(`Failed to upload to R2: ${(error as Error).message}`);
    }
};