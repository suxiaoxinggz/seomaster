import { TranslationProvider, TranslationApiKeys } from '../types';
import { fetchProxy } from './proxyService';

/**
 * Maps readable language names to specific ISO codes required by each provider.
 * Official Docs Reference:
 * DeepL: https://developers.deepl.com/docs/resources/supported-languages
 * Google: https://cloud.google.com/translate/docs/languages
 * Microsoft: https://learn.microsoft.com/en-us/azure/ai-services/translator/language-support
 */
const getLanguageCode = (languageName: string, provider: TranslationProvider): string => {
    const name = languageName.toLowerCase();

    // --- 1. DeepL Logic ---
    if (provider === TranslationProvider.DEEPL) {
        if (name.includes('chinese')) return 'ZH'; // DeepL primarily supports Simplified as 'ZH'
        if (name.includes('english')) return 'EN-US'; // Prefer US English for generic "English"
        if (name.includes('spanish')) return 'ES';
        if (name.includes('japanese')) return 'JA';
        if (name.includes('german')) return 'DE';
        if (name.includes('french')) return 'FR';
        if (name.includes('korean')) return 'KO';
        if (name.includes('russian')) return 'RU';
        if (name.includes('portuguese')) return 'PT-BR'; // Default to Brazilian Portuguese for generic
        if (name.includes('italian')) return 'IT';
        if (name.includes('dutch')) return 'NL';
        if (name.includes('polish')) return 'PL';
        return 'EN-US'; // Fallback
    }

    // --- 2. Microsoft Logic (zh-Hans / zh-Hant) ---
    if (provider === TranslationProvider.MICROSOFT) {
        if (name.includes('chinese')) return name.includes('traditional') ? 'zh-Hant' : 'zh-Hans';
        if (name.includes('english')) return 'en';
        if (name.includes('spanish')) return 'es';
        if (name.includes('japanese')) return 'ja';
        if (name.includes('german')) return 'de';
        if (name.includes('french')) return 'fr';
        if (name.includes('korean')) return 'ko';
        if (name.includes('russian')) return 'ru';
        if (name.includes('portuguese')) return 'pt';
        if (name.includes('italian')) return 'it';
        return 'en';
    }

    // --- 3. Google Logic (zh-CN / zh-TW) ---
    // Default fallback for Google and others
    if (name.includes('chinese')) return name.includes('traditional') ? 'zh-TW' : 'zh-CN';
    if (name.includes('english')) return 'en';
    if (name.includes('spanish')) return 'es';
    if (name.includes('japanese')) return 'ja';
    if (name.includes('german')) return 'de';
    if (name.includes('french')) return 'fr';
    if (name.includes('korean')) return 'ko';
    if (name.includes('russian')) return 'ru';
    if (name.includes('portuguese')) return 'pt';
    if (name.includes('italian')) return 'it';

    return 'en';
};

/**
 * Executes a translation using DeepL API V2 via Backend Proxy.
 * Automatically switches between Free and Pro endpoints based on key suffix (:fx).
 */
const translateDeepL = async (text: string, targetLang: string, key: string): Promise<string> => {
    // Official DeepL routing logic: Keys ending in :fx are for the Free API.
    const isFree = key.endsWith(':fx');
    const endpoint = isFree
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate';

    // Official Docs: https://developers.deepl.com/docs/api-access
    console.log(`[DeepL] Using ${isFree ? 'FREE' : 'PRO'} API Endpoint: ${endpoint}`);

    // Use JSON-based API (supported by DeepL) for easier proxying
    // Content-Type: application/json for DeepL expects { text: ["..."], target_lang: "..." }
    const response = await fetchProxy({
        url: endpoint,
        method: 'POST',
        headers: {
            'Authorization': `DeepL-Auth-Key ${key}`,
            'Content-Type': 'application/json'
        },
        body: {
            text: [text],
            target_lang: getLanguageCode(targetLang, TranslationProvider.DEEPL)
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepL API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.translations[0]?.text || '';
};

/**
 * Executes a translation using Google Cloud Translation API (Basic / v2) via Backend Proxy.
 * Note: Requires an API Key restricted to "Cloud Translation API".
 */
const translateGoogle = async (text: string, targetLang: string, key: string): Promise<string> => {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${key}`;

    const response = await fetchProxy({
        url: url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
            q: text,
            target: getLanguageCode(targetLang, TranslationProvider.GOOGLE),
            format: 'text' // Use 'text' to prevent Google from escaping HTML entities double time if input is markdown
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Google API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data.translations[0]?.translatedText || '';
};

/**
 * Executes a translation using Microsoft Azure Translator Text API V3.0 via Backend Proxy.
 * Requires "Ocp-Apim-Subscription-Region" if the resource is not global.
 */
const translateMicrosoft = async (text: string, targetLang: string, key: string, region: string): Promise<string> => {
    const langCode = getLanguageCode(targetLang, TranslationProvider.MICROSOFT);
    const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${langCode}`;

    const headers: Record<string, string> = {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/json'
    };

    // If resource is not "Global", region header is MANDATORY.
    if (region && region.trim() !== '' && region.toLowerCase() !== 'global') {
        headers['Ocp-Apim-Subscription-Region'] = region;
    }

    const response = await fetchProxy({
        url: url,
        method: 'POST',
        headers: headers,
        body: [{ 'Text': text }]
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Microsoft API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    // Structure: [{ "translations": [ { "text": "..." } ] }]
    return data[0]?.translations[0]?.text || '';
};

/**
 * Public Handler that routes to the correct provider.
 */
export const fetchTranslation = async (
    text: string,
    targetLang: string,
    provider: TranslationProvider,
    keys: TranslationApiKeys
): Promise<string> => {
    if (!text) return '';

    try {
        switch (provider) {
            case TranslationProvider.DEEPL:
                if (!keys[TranslationProvider.DEEPL]) throw new Error("DeepL API Key is missing. Please configure it in settings.");
                return await translateDeepL(text, targetLang, keys[TranslationProvider.DEEPL].trim());

            case TranslationProvider.GOOGLE:
                if (!keys[TranslationProvider.GOOGLE]) throw new Error("Google Translate API Key is missing. Please configure it in settings.");
                return await translateGoogle(text, targetLang, keys[TranslationProvider.GOOGLE].trim());

            case TranslationProvider.MICROSOFT:
                if (!keys[TranslationProvider.MICROSOFT]) throw new Error("Microsoft Translator Key is missing. Please configure it in settings.");
                return await translateMicrosoft(text, targetLang, keys[TranslationProvider.MICROSOFT].trim(), keys.microsoft_region?.trim() || '');

            default:
                throw new Error("Invalid Translation Provider selected.");
        }
    } catch (error) {
        console.error("Translation Service Error:", error);
        throw error; // Re-throw to be caught by the UI
    }
};
