
import { PostgrestError } from '@supabase/supabase-js'

export enum ModelProvider {
  PRESET = 'Preset',
  CUSTOM = 'Custom',
}

export enum ApiProvider {
  ZHIPU = 'Zhipu AI (GLM)',
  MOONSHOT = 'Moonshot (Kimi)',
  YI = '01.ai (Yi)',
  MISTRAL = 'Mistral AI', 
  TOGETHER = 'Together AI', 
  GEMINI = 'Google Gemini',
  OPENAI = 'OpenAI',
  ANTHROPIC = 'Anthropic (Claude)',
  DEEPSEEK = 'DeepSeek',
  GROQ = 'Groq (Ultra Fast)',
  SILICONFLOW = 'SiliconFlow (Qwen/DeepSeek)',
  OPENROUTER = 'OpenRouter',
  MODELSCOPE = 'ModelScope',
  NEBIUS = 'Nebius AI',
  OPENAI_COMPATIBLE = 'OpenAI Compatible (Any)', 
  MOCK = 'Mock Data',
}

export enum TranslationProvider {
    LLM = 'LLM (Current Model)',
    DEEPL = 'DeepL API',
    GOOGLE = 'Google Translate API',
    MICROSOFT = 'Microsoft Translator',
}

// ... (Existing Interfaces kept as is) ...

export interface TranslationApiKeys {
    [TranslationProvider.DEEPL]: string;
    [TranslationProvider.GOOGLE]: string;
    [TranslationProvider.MICROSOFT]: string;
    'microsoft_region'?: string; // Microsoft requires region
}

// --- NEW: SEO Strategy Types ---

export interface SeoGlobalConfig {
    siteName: string;
    baseUrl: string;
    titleTemplate: string;
    defaultDescription: string;
    twitterHandle?: string;
}

export interface RobotsRule {
    userAgent: string;
    allow: string[];
    disallow: string[];
}

export interface SitemapEntry {
    url: string;
    priority: number;
    changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

export interface LlmsTxtConfig {
    projectName: string;
    summary: string;
    intro: string;
    docs: { title: string; url: string }[];
}

export interface JsonLdConfig {
    type: 'SoftwareApplication' | 'FAQ' | 'Article';
    data: Record<string, any>;
}

// --- End SEO Strategy Types ---

// --- NEW: Industrial-Grade SEO Data Structures ---

// 1. Keyword Intelligence (Labs API)
export interface SearchVolumeTrend {
    year: number;
    month: number;
    search_volume: number;
}

export interface KeywordMetric {
    keyword: string;
    
    // Volume & Traffic
    search_volume: number; // 12-month average
    clickstream_volume?: number; // Real user clickstream data (if enabled)
    is_normalized: boolean; // True if using clickstream/normalized data
    impressions_potential?: number; // Daily impressions estimate
    
    // CPC & Bidding (Commercial Intent)
    cpc: number; 
    low_top_of_page_bid?: number; // Low range for top of page ad
    high_top_of_page_bid?: number; // High range for top of page ad
    
    // Difficulty & Competition
    competition: number; // 0-1 float (Ad competition)
    competition_level: 'LOW' | 'MEDIUM' | 'HIGH';
    keyword_difficulty?: number; // 0-100 SEO Difficulty (Organic)
    
    // Semantics
    search_intent?: string; // informational, commercial, etc.
    
    // Visuals
    trend_history: number[]; // Array of last 12 months volume for Sparklines
    
    updated_at: string;
}

// 2. SERP Ecosystem (Organic + Features)
export interface SerpItem {
    type: 'organic' | 'featured_snippet' | 'people_also_ask' | 'video' | 'local_pack' | 'knowledge_graph' | 'related_searches' | 'images';
    rank_group: number;
    rank_absolute: number;
    title: string;
    url: string;
    description: string;
    domain: string;
    breadcrumbs?: string;
    // Specific fields
    items?: any[]; // For nested items like PAA questions
    faq?: { question: string; answer: string }[];
}

export interface SerpAnalysisData {
    keyword: string;
    location_code: number;
    language_code: string;
    items: SerpItem[]; // Flattened list of top results
    people_also_ask: string[]; // Extracted questions
    related_searches: string[]; // LSI keywords
    created_at: string;
    search_parameters?: SeoSearchParams;
}

// 3. AI Visibility (LLM Mentions)
export interface AiSource {
    domain: string;
    url: string;
    title?: string;
}

export interface AiVisibilityData {
    keyword: string;
    platform: 'chat_gpt' | 'google_ai_overview';
    mentions_count: number;
    sources: AiSource[]; // Where the LLM got its info
    summary: string; // Brief summary of the LLM's answer
    sentiment: 'positive' | 'neutral' | 'negative';
}

// 4. Content Generation (DataForSEO V3)
export interface ContentGenParams {
    mode: 'generate' | 'generate_text' | 'paraphrase' | 'check_grammar' | 'text_summary' | 'generate_meta_tags' | 'generate_sub_topics';
    
    // Core Inputs
    text?: string; // For paraphrase, grammar, summary, generate (prompt), meta tags
    topic?: string; // For generate_text, sub_topics
    
    // Advanced Control
    creativity_index?: number; // 0.0 - 1.0 (If set, ignores top_k/p/temp)
    top_k?: number; // 1-100
    top_p?: number; // 0-1
    temperature?: number; // 0-1
    
    word_count?: number; // For generate_text
    max_tokens?: number; // For generate
    
    // Filtering
    include_words?: string[]; // For generate_text
    avoid_words?: string[]; // For generate
    avoid_starting_words?: string[]; // For generate
    
    language_code?: string; // For grammar check
}

export interface GrammarError {
    type: string;
    description: string;
    suggestions: string[];
}

export interface ContentGenResult {
    // Text Generation
    generated_text?: string;
    input_tokens?: number;
    output_tokens?: number;
    new_tokens?: number;

    // Grammar
    input_text?: string;
    corrected_text?: string;
    grammar_errors?: GrammarError[];

    // Summary
    sentences?: number;
    paragraphs?: number;
    words?: number;
    readability_score?: number; // flesch_kincaid_reading_ease
    grade_level?: number; // flesch_kincaid_grade_level
    vocabulary_density?: number;

    // Meta Tags
    meta_title?: string;
    meta_description?: string;

    // Sub Topics
    sub_topics?: string[];
}

// 5. Saved SEO Snapshot (NEW)
export interface SeoSnapshot {
    id: string;
    user_id?: string;
    type: 'market_intelligence' | 'serp_analysis' | 'ai_visibility';
    query: string; // The search term(s)
    parameters: any; // SeoSearchParams or similar config
    data: any; // The raw result data (KeywordMetric[], SerpAnalysisData, etc.)
    created_at: string;
    tags?: string[];
}

// Configuration & Params
export interface SeoConfig {
    provider: 'mock' | 'dataforseo' | 'seofordata'; 
    apiLogin?: string;
    apiPassword?: string; 
    baseUrl?: string; 
    defaultLocation?: number; // e.g. 2840 (US)
    defaultLanguage?: string; // e.g. 'en'
}

export interface SeoSearchParams {
    // Core Targeting
    location_code: number; 
    language_code: string; 
    
    // Keyword Research Specifics
    include_clickstream?: boolean; // For volume calibration (cost++)
    include_serp_info?: boolean; // Get SERP snapshot data (cost++)
    depth?: number; // For related keywords recursion (0-4)
    tag?: string; // Custom tag for task tracking
    limit?: number; // Limit results
    
    // SERP Specifics
    device?: 'desktop' | 'mobile';
    os?: 'windows' | 'macos' | 'android' | 'ios';
}

// Legacy Support (Mapping new structures to old simple interface if needed)
export interface SeoMetrics {
    volume: number;
    difficulty: number;
    cpc: number;
    trend?: number[];
}

// ... (Keep existing Interfaces: Model, Project, LSIKeyword, etc. unchanged) ...
export interface Model {
  id: string;
  user_id?: string;
  nickname: string;
  apiKey: string; 
  baseURL?: string;
  version?: string;
  supportsWebSearch: boolean;
  type: ModelProvider;
  apiProvider: ApiProvider;
  isDefault?: boolean;
}

export interface Project {
  id: string;
  user_id?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface LSIKeyword {
  text: string;
  isNew?: boolean;
}

export interface Level2Node {
  keyword: string;
  type: '认知型 (Awareness)' | '决策型 (Decision)' | '信任型 (Trust)' | '行动型 (Action)';
  lsi: string[];
}

export interface Level1Node {
  keyword: string;
  type: '引流型' | '对比型' | '转化型';
  pageType: string;
  children: Level2Node[];
}

export interface KeywordMap {
  coreUserIntent: string;
  originalKeywords: {
    traffic: string[];
    comparison: string[];
    conversion: string[];
  };
  keywordHierarchy: Level1Node[];
}

export interface RenderLsiNode {
  id: string;
  text: string;
  isNew?: boolean;
  metrics?: SeoMetrics; // Added metrics
}
export interface RenderLevel2Node {
  id:string;
  keyword: string;
  type: string;
  lsi: RenderLsiNode[];
  metrics?: SeoMetrics; // Added metrics
}

export interface RenderLevel1Node {
  id: string;
  keyword: string;
  type: string;
  pageType: string;
  children: RenderLevel2Node[];
  metrics?: SeoMetrics; // Added metrics
}

export type SelectedKeywords = Record<string, boolean>;

export interface SavedLsiNode {
  id: string;
  text: string;
}
export interface SavedLevel2Node {
  id: string;
  keyword: string;
  type: string;
  lsi: SavedLsiNode[];
}

export interface SavedLevel1Node {
  id: string;
  keyword: string;
  type: string;
  pageType: string;
  children: SavedLevel2Node[];
}

export interface KeywordSubProject {
    id: string;
    user_id?: string;
    name: string;
    parentProjectId: string;
    savedAt: string;
    modelUsed: string;
    keywords: SavedLevel1Node[];
    translations?: Record<string, string>;
    publishedDestinations?: PublishedDestination[];
}

export interface PublishedDestinationDetail {
    status: 'success' | 'failed';
    log: string;
    url?: string;
}

export interface PublishedDestination {
  platform: PublishingPlatform;
  status: 'success' | 'failed';
  target: string; 
  url?: string; 
  path?: string; 
  publishedAt: string; 
  log: string; 
  details?: PublishedDestinationDetail[]; 
}

export interface Article {
  id: string;
  user_id?: string;
  title: string;
  content: string; 
  keywordContext: string;
  parentProjectId: string;
  subProjectId: string;
  createdAt: string;
  modelUsed: string;
  publishedDestinations: PublishedDestination[];
}

export enum ImageSource {
  POLLINATIONS = 'Flux/SD (Pollinations)',
  KOLARS = 'Kolors (SiliconFlow)',
  ZHIPU_COGVIEW = 'CogView (Zhipu AI)', 
  NEBIUS = 'Nebius AI (Flux)',
  DALLE3 = 'DALL-E 3 (OpenAI)',
  STABILITY = 'Stable Diffusion 3.5',
  REPLICATE = 'Replicate',
  HUGGINGFACE = 'Hugging Face',
  CLOUDFLARE = 'Cloudflare Workers AI', 
  OPENROUTER = 'OpenRouter', 
  PIXABAY = 'Pixabay (Stock)',
  UNSPLASH = 'Unsplash (Stock)',
}

export interface ImageApiKeys {
  [ImageSource.PIXABAY]: string;
  [ImageSource.UNSPLASH]: string;
  [ImageSource.KOLARS]: string;
  [ImageSource.POLLINATIONS]: string; 
  [ImageSource.NEBIUS]: string;
  [ImageSource.ZHIPU_COGVIEW]: string; 
  [ImageSource.DALLE3]: string; 
  [ImageSource.STABILITY]: string; 
  [ImageSource.REPLICATE]: string; 
  [ImageSource.HUGGINGFACE]: string; 
  [ImageSource.OPENROUTER]: string; 
  'cloudflare_account_id': string; 
  'cloudflare_token': string; 
}

export interface ImageObject {
  id: string;
  url_regular: string; 
  url_full: string; 
  alt_description: string;
  author_name: string;
  author_url: string;
  source_platform: ImageSource;
  source_url: string; 
  width: number;
  height: number;
  base64?: string; 
  userDefinedName?: string; 
  publishedDestinations?: PublishedDestination[];
}

export interface SavedImageSet {
  id: string;
  user_id?: string;
  name: string; 
  searchTermOrPrompt: string;
  images: ImageObject[];
  createdAt: string;
  parentProjectId: string;
  subProjectId: string;
  publishedDestinations: PublishedDestination[];
}

export interface PostToPublish {
  id: string;
  user_id?: string;
  title: string;
  htmlContent: string;
  markdownContent: string;
  keywordContext: string;
  usedImages: ImageObject[];
  createdAt: string;
  parentProjectId: string;
  subProjectId: string;
  publishedDestinations: PublishedDestination[];
}


export interface BaseImageParams {
  query: string; 
  prompt: string; 
  per_page: number;
  negative_prompt: string;
}

export interface PixabayParams extends BaseImageParams {
  order: 'popular' | 'latest';
  orientation: 'all' | 'horizontal' | 'vertical';
  safesearch: boolean;
  editors_choice: boolean;
}

export interface UnsplashParams extends BaseImageParams {
  orientation: 'landscape' | 'portrait' | 'squarish';
}

export interface KolarsParams extends BaseImageParams {
    model: 'Kwai-Kolors/Kolors';
    image_size: '1024x1024' | '768x1024' | '1024x768' | '1024x1024' | '1024x768' | '768x1024';
    num_inference_steps: number; 
    guidance_scale: number; 
    seed?: number;
    enhance: boolean;
    nologo: boolean;
    transparent: boolean;
    private: boolean;
}

export interface ZhipuImageParams extends BaseImageParams {
    model: 'cogview-3-flash' | 'cogview-3-plus' | 'cogview-3';
    size: '1024x1024' | '768x1344' | '1344x768' | '864x1152' | '1152x864' | '1440x720' | '720x1440';
}

export interface PollinationsParams extends BaseImageParams {
    model: 'flux' | 'flux-realism' | 'turbo';
    width: number;
    height: number;
    seed?: number;
    nologo: boolean;
    enhance: boolean;
    private: boolean;
    transparent: boolean;
}

export interface DalleParams extends BaseImageParams {
    model: 'dall-e-3';
    size: '1024x1024' | '1024x1792' | '1792x1024';
    quality: 'standard' | 'hd';
    style: 'vivid' | 'natural';
}

export interface StabilityParams extends BaseImageParams {
    model: 'sd3.5-large' | 'sd3.5-large-turbo';
    aspect_ratio: '1:1' | '16:9' | '21:9' | '2:3' | '3:2' | '4:5' | '5:4' | '9:16' | '9:21';
    output_format: 'jpeg' | 'png';
}

export interface ReplicateParams extends BaseImageParams {
    model: string; 
    width: number;
    height: number;
    aspect_ratio?: string; 
    scheduler?: string;
    num_inference_steps?: number;
    guidance_scale?: number;
    output_format?: string;
    safety_tolerance?: number;
}

export interface HuggingFaceParams extends BaseImageParams {
    model: string; 
    width?: number; 
    height?: number;
    num_inference_steps?: number;
    guidance_scale?: number;
}

export interface CloudflareParams extends BaseImageParams {
    model: string; 
    num_steps?: number; 
    guidance?: number; 
}

export interface OpenRouterParams extends BaseImageParams {
    model: string; 
    width?: number;
    height?: number;
    num_inference_steps?: number;
}

export interface NebiusParams extends BaseImageParams {
    model: 'black-forest-labs/flux-1-schnell' | 'black-forest-labs/flux-1-dev' | 'stability-ai/sdxl';
    width?: number;
    height?: number;
    num_inference_steps?: number;
    seed?: number;
}


export type ImageSearchParams = PixabayParams | UnsplashParams | KolarsParams | PollinationsParams | DalleParams | StabilityParams | ReplicateParams | HuggingFaceParams | CloudflareParams | OpenRouterParams | NebiusParams | ZhipuImageParams;


export enum PublishingPlatform {
  WORDPRESS = 'WordPress',
  CLOUDFLARE_R2 = 'Cloudflare R2',
  SUPABASE = 'Supabase',
  GCS = 'Google Cloud Storage',
  S3 = 'Amazon S3',
  CUSTOM = 'Custom REST API',
}

export interface WpTerm {
  id: number;
  name: string;
  count: number;
}

export interface PublishingChannel {
  id: string;
  user_id?: string;
  name: string;
  platform: PublishingPlatform;
  config: Record<string, any>; 
  isDefault?: boolean;
}


export type Page = 
  | 'dashboard'
  | 'keyword-map'
  | 'outline-article'
  | 'image-text'
  | 'localization'
  | 'publish'
  | 'settings'
  | 'seo-data'
  | 'seo-strategy'; // NEW


export type PublishableItemType = 'article' | 'post' | 'image_set';

export interface PublishingItem {
  id: string; 
  user_id?: string;
  sourceId: string; 
  sourceType: PublishableItemType;
  name: string; 
  status: 'queued' | 'publishing' | 'success' | 'failed';
  log: string; 
  data?: Article | PostToPublish | SavedImageSet; 
}

// --- NEW NAVIGATION PAYLOAD ---
export interface NavigationPayload {
    type: 'draft_article' | 'create_images' | 'change_seo_tab';
    data: {
        context?: string; // For drafting article
        modelId?: string; // For drafting article
        content?: string; // For creating images
        sourceArticleId?: string; // For linking back to update the article
        projectContext?: { parentId: string; subId: string }; // Context for saving
        targetTab?: string; // For SEO Data Manager navigation
    };
}

// ... (Keep Database interface unchanged) ...
// Supabase Database Schema
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project & { user_id: string };
        Insert: Partial<Project & { user_id: string }>;
        Update: Partial<Project & { user_id: string }>;
      };
      keyword_library: {
        Row: KeywordSubProject & { user_id: string };
        Insert: Partial<KeywordSubProject & { user_id: string }>;
        Update: Partial<KeywordSubProject & { user_id: string }>;
      };
      articles: {
        Row: Article & { user_id: string };
        Insert: Partial<Article & { user_id: string }>;
        Update: Partial<Article & { user_id: string }>;
      };
      models: {
        Row: Model & { user_id: string };
        Insert: Partial<Model & { user_id: string }>;
        Update: Partial<Model & { user_id: string }>;
      };
      posts_to_publish: {
        Row: PostToPublish & { user_id: string };
        Insert: Partial<PostToPublish & { user_id: string }>;
        Update: Partial<PostToPublish & { user_id: string }>;
      };
      publishing_channels: {
        Row: PublishingChannel & { user_id: string };
        Insert: Partial<PublishingChannel & { user_id: string }>;
        Update: Partial<PublishingChannel & { user_id: string }>;
      };
      publishing_queue: {
        Row: PublishingItem & { user_id: string };
        Insert: Partial<PublishingItem & { user_id: string }>;
        Update: Partial<PublishingItem & { user_id: string }>;
      };
      saved_image_sets: {
        Row: SavedImageSet & { user_id: string };
        Insert: Partial<SavedImageSet & { user_id: string }>;
        Update: Partial<SavedImageSet & { user_id: string }>;
      };
      seo_snapshots: {
        Row: SeoSnapshot & { user_id: string };
        Insert: Partial<SeoSnapshot & { user_id: string }>;
        Update: Partial<SeoSnapshot & { user_id: string }>;
      };
    };
    Views: {};
    Functions: {};
  };
}
