import { Model, ModelProvider, ApiProvider } from './types';

export const DFS_BASE = 'https://api.dataforseo.com/v3';

export const PRESET_MODELS: Model[] = [
  {
    id: 'mistral-large-latest',
    nickname: 'Mistral Large (Top Tier)',
    api_key: '', // User key required
    base_url: 'https://api.mistral.ai/v1',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.MISTRAL,
  },
  {
    id: 'open-mistral-nemo',
    nickname: 'Mistral Nemo (Fast/Cheap)',
    api_key: '', // User key required
    base_url: 'https://api.mistral.ai/v1',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.MISTRAL,
  },
  {
    id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
    nickname: 'Llama 3.1 405B (Together AI)',
    api_key: '', // User key required
    base_url: 'https://api.together.xyz/v1',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.TOGETHER,
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
    nickname: 'Qwen 2.5 72B (Together AI)',
    api_key: '', // User key required
    base_url: 'https://api.together.xyz/v1',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.TOGETHER,
  },
  {
    id: 'moonshot-v1-auto',
    nickname: 'Kimi (Moonshot) - Auto Context',
    api_key: '', // User key required
    base_url: 'https://api.moonshot.cn/v1',
    supports_web_search: true, // Kimi supports retrieval via tools usually, but we treat it as basic LLM here unless configured
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.MOONSHOT,
  },
  {
    id: 'yi-lightning',
    nickname: 'Yi-Lightning (01.ai) - Fast/Cheap',
    api_key: '', // User key required
    base_url: 'https://api.lingyiwanwu.com/v1',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.YI,
  },
  {
    id: 'glm-4.5-flash',
    nickname: 'Zhipu GLM-4.5 Flash (Ultra Fast)',
    api_key: '', // User key required
    base_url: 'https://open.bigmodel.cn/api/paas/v4',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.ZHIPU,
  },
  {
    id: 'glm-4-flash',
    nickname: 'Zhipu GLM-4 Flash (Free)',
    api_key: '', // User key required
    base_url: 'https://open.bigmodel.cn/api/paas/v4',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.ZHIPU,
  },
  {
    id: 'glm-z1-flash',
    nickname: 'Zhipu GLM-Z1 Flash (Reasoning)',
    api_key: '', // User key required
    base_url: 'https://open.bigmodel.cn/api/paas/v4',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.ZHIPU,
  },
  {
    id: 'glm-4.6v-flash',
    nickname: 'Zhipu GLM-4.6V Flash (Multimodal)',
    api_key: '', // User key required
    base_url: 'https://open.bigmodel.cn/api/paas/v4',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.ZHIPU,
  },
  {
    id: 'deepseek-reasoner',
    nickname: 'DeepSeek R1 (推理模型)',
    api_key: '', // User key required
    base_url: 'https://api.deepseek.com',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.DEEPSEEK,
  },
  {
    id: 'deepseek-chat',
    nickname: 'DeepSeek V3 (快速智能)',
    api_key: '', // User key required
    base_url: 'https://api.deepseek.com',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.DEEPSEEK,
  },
  {
    id: 'llama-3.3-70b-versatile',
    nickname: 'Llama 3.3 70B (Groq - Free/Fast)',
    api_key: '', // User key required
    base_url: 'https://api.groq.com/openai/v1',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.GROQ,
  },
  {
    id: 'mixtral-8x7b-32768',
    nickname: 'Mixtral 8x7B (Groq - Free/Fast)',
    api_key: '', // User key required
    base_url: 'https://api.groq.com/openai/v1',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.GROQ,
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct',
    nickname: 'Qwen 2.5 72B (SiliconFlow - Cheap)',
    api_key: '', // User key required
    base_url: 'https://api.siliconflow.cn/v1',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.SILICONFLOW,
  },
  {
    id: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    nickname: 'Llama 3.1 70B (Nebius - High Quality)',
    api_key: '', // User key required
    base_url: 'https://api.studio.nebius.ai/v1',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.NEBIUS,
  },
  {
    id: 'gemini-2.0-flash',
    nickname: 'Google Gemini 2.0 Flash',
    api_key: '', // Key handled server-side or client-side
    supports_web_search: true,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.GEMINI,
  },
  {
    id: 'gemini-1.5-pro',
    nickname: 'Google Gemini 1.5 Pro',
    api_key: '',
    supports_web_search: true,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.GEMINI,
  },
  {
    id: 'claude-3-5-sonnet-latest',
    nickname: 'Claude 3.5 Sonnet',
    api_key: '', // User key required
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.ANTHROPIC,
  },
  {
    id: 'gpt-4o',
    nickname: 'OpenAI GPT-4o',
    api_key: '', // User key required
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.OPENAI,
  },
  {
    id: 'gpt-4o-mini',
    nickname: 'OpenAI GPT-4o Mini',
    api_key: '',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.OPENAI,
  },
  {
    id: 'o1-mini',
    nickname: 'OpenAI o1-mini (Reasoning)',
    api_key: '',
    supports_web_search: false,
    type: ModelProvider.PRESET,
    api_provider: ApiProvider.OPENAI,
  }
];

export const SEO_PROMPT_TEMPLATE = `
You are a 15-year SEO strategist. Your task is to analyze initial keywords for my site and build a multi-level SEO topic map. 

**Strict Output Requirement:**
You MUST return ONLY a valid JSON object. Do not output markdown code blocks (like \`\`\`json). Do not output any conversational text.

**Task Steps:**
1.  **Analyze User Persona & Search Intent:** Understand the user need behind the keywords.
2.  **Classify Core Intent:** Categorize keywords into Traffic-driving, Comparison, and Conversion.
3.  **Create Topic Map:**
    - **Level 1:** Core keyword + Page Type.
    - **Level 2:** Sub-core keywords based on user journey (Awareness -> Decision -> Trust -> Action).
    - **Level 3 (LSI):** At least 10 highly related LSI keywords for EACH Level 2 keyword.

**INPUT KEYWORDS:**
{initialKeywords}

**ADDITIONAL INSTRUCTIONS:**
{extraInstructions}
`;

export const KEYWORD_MAP_JSON_STRUCTURE = `
**REQUIRED JSON STRUCTURE:**
{
  "coreUserIntent": "Summary string",
  "originalKeywords": {
    "traffic": ["string"],
    "comparison": ["string"],
    "conversion": ["string"]
  },
  "keywordHierarchy": [
    {
      "keyword": "Level 1 Keyword",
      "type": "引流型",
      "pageType": "文章类",
      "children": [
        {
          "keyword": "Level 2 Keyword",
          "type": "认知型 (Awareness)",
          "lsi": ["lsi1", "lsi2"]
        }
      ]
    }
  ]
}
`;

export const LSI_GENERATION_PROMPT_TEMPLATE = `
Generate at least 15 new, unique LSI (Latent Semantic Indexing) keywords for the Level 2 keyword: "{level2Keyword}".

**Context:**
- Parent Topic: "{level1Keyword}"
- User Intent: {level2Type}
- Initial User Keywords: "{initialKeywords}"
- Extra User Instructions: "{extraInstructions}"
- Existing LSI (Avoid these): {existingLSI}

**Output Requirement:**
Return ONLY a valid JSON array of strings. No markdown. No explanations.

**Example:**
["new keyword 1", "new keyword 2"]
`;

export const ARTICLE_PROMPT_TEMPLATE = `
You are an expert SEO content writer. Write a comprehensive article based on the following keyword context.

**Instructions:**
1.  **Use Markdown:** Use H1, H2, H3, bolding, and lists.
2.  **SEO Optimization:** Naturally weave the provided keywords into the text.
3.  **Tone:** Professional yet engaging.
4.  **Language:** English.

**KEYWORD CONTEXT:**
{keywordContext}

Start writing the article immediately. Do not include any pre-text like "Here is the article".
`;

export const TRANSLATE_PROMPT_TEMPLATE = `
You are a professional translator and localization expert.
Task: Translate the following content into natural, fluent Chinese.

**CRITICAL INSTRUCTIONS:**
1.  **Strictly Preserve Markdown**: Do NOT change, remove, or translate any Markdown syntax (headers #, bold **, links [], code blocks, images ![]).
2.  **Preserve HTML**: Do NOT translate or remove HTML tags (<img>, <div>, <span>).
3.  **Tone**: Professional, engaging, and native-sounding.
4.  **No Commentary**: Return ONLY the translated content. Do not say "Here is the translation".

**CONTENT TO TRANSLATE:**
{textToTranslate}
`;

export const BATCH_TRANSLATE_PROMPT_TEMPLATE = `
Translate the following JSON array of English terms into Chinese.
Return ONLY a JSON object mapping English to Chinese.

**INPUT:**
{jsonStringArray}

**OUTPUT FORMAT:**
{ "English Term": "Chinese Term" }
`;