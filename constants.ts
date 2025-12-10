import { Model, ModelProvider, ApiProvider } from './types';

export const DFS_BASE = 'https://api.dataforseo.com/v3';

export const PRESET_MODELS: Model[] = [
  {
    id: 'mistral-large-latest',
    nickname: 'Mistral Large (Top Tier)',
    apiKey: '', // User key required
    baseURL: 'https://api.mistral.ai/v1',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.MISTRAL,
  },
  {
    id: 'open-mistral-nemo',
    nickname: 'Mistral Nemo (Fast/Cheap)',
    apiKey: '', // User key required
    baseURL: 'https://api.mistral.ai/v1',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.MISTRAL,
  },
  {
    id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
    nickname: 'Llama 3.1 405B (Together AI)',
    apiKey: '', // User key required
    baseURL: 'https://api.together.xyz/v1',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.TOGETHER,
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
    nickname: 'Qwen 2.5 72B (Together AI)',
    apiKey: '', // User key required
    baseURL: 'https://api.together.xyz/v1',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.TOGETHER,
  },
  {
    id: 'moonshot-v1-auto',
    nickname: 'Kimi (Moonshot) - Auto Context',
    apiKey: '', // User key required
    baseURL: 'https://api.moonshot.cn/v1',
    supportsWebSearch: true, // Kimi supports retrieval via tools usually, but we treat it as basic LLM here unless configured
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.MOONSHOT,
  },
  {
    id: 'yi-lightning',
    nickname: 'Yi-Lightning (01.ai) - Fast/Cheap',
    apiKey: '', // User key required
    baseURL: 'https://api.lingyiwanwu.com/v1',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.YI,
  },
  {
    id: 'glm-4.5-flash',
    nickname: 'Zhipu GLM-4.5 Flash (Ultra Fast)',
    apiKey: '', // User key required
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.ZHIPU,
  },
  {
    id: 'glm-4-flash',
    nickname: 'Zhipu GLM-4 Flash (Free)',
    apiKey: '', // User key required
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.ZHIPU,
  },
  {
    id: 'glm-z1-flash',
    nickname: 'Zhipu GLM-Z1 Flash (Reasoning)',
    apiKey: '', // User key required
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.ZHIPU,
  },
  {
    id: 'glm-4.6v-flash',
    nickname: 'Zhipu GLM-4.6V Flash (Multimodal)',
    apiKey: '', // User key required
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.ZHIPU,
  },
  {
    id: 'deepseek-reasoner',
    nickname: 'DeepSeek R1 (推理模型)',
    apiKey: '', // User key required
    baseURL: 'https://api.deepseek.com',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.DEEPSEEK,
  },
  {
    id: 'deepseek-chat',
    nickname: 'DeepSeek V3 (快速智能)',
    apiKey: '', // User key required
    baseURL: 'https://api.deepseek.com',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.DEEPSEEK,
  },
  {
    id: 'llama-3.3-70b-versatile',
    nickname: 'Llama 3.3 70B (Groq - Free/Fast)',
    apiKey: '', // User key required
    baseURL: 'https://api.groq.com/openai/v1',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.GROQ,
  },
  {
    id: 'mixtral-8x7b-32768',
    nickname: 'Mixtral 8x7B (Groq - Free/Fast)',
    apiKey: '', // User key required
    baseURL: 'https://api.groq.com/openai/v1',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.GROQ,
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct',
    nickname: 'Qwen 2.5 72B (SiliconFlow - Cheap)',
    apiKey: '', // User key required
    baseURL: 'https://api.siliconflow.cn/v1',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.SILICONFLOW,
  },
  {
    id: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    nickname: 'Llama 3.1 70B (Nebius - High Quality)',
    apiKey: '', // User key required
    baseURL: 'https://api.studio.nebius.ai/v1',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.NEBIUS,
  },
  {
    id: 'gemini-2.0-flash',
    nickname: 'Google Gemini 2.0 Flash',
    apiKey: '', // Key handled server-side or client-side
    supportsWebSearch: true,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.GEMINI,
  },
  {
    id: 'gemini-1.5-pro',
    nickname: 'Google Gemini 1.5 Pro',
    apiKey: '',
    supportsWebSearch: true,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.GEMINI,
  },
  {
    id: 'claude-3-5-sonnet-latest',
    nickname: 'Claude 3.5 Sonnet',
    apiKey: '', // User key required
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.ANTHROPIC,
  },
  {
    id: 'gpt-4o',
    nickname: 'OpenAI GPT-4o',
    apiKey: '', // User key required
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.OPENAI,
  },
  {
    id: 'gpt-4o-mini',
    nickname: 'OpenAI GPT-4o Mini',
    apiKey: '',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.OPENAI,
  },
  {
    id: 'o1-mini',
    nickname: 'OpenAI o1-mini (Reasoning)',
    apiKey: '',
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.OPENAI,
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
Generate at least 10 new, unique LSI (Latent Semantic Indexing) keywords for the Level 2 keyword: "{level2Keyword}".

**Context:**
- Parent Topic: "{level1Keyword}"
- User Intent: {level2Type}
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
Translate the following text into natural, fluent Chinese.
Return ONLY the translation. No explanations.

**TEXT:**
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