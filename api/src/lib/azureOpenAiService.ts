import OpenAI, { AzureOpenAI } from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResult {
  reply: string;
  isMock: boolean;
  provider: 'openai-compatible-gateway' | 'azure-openai' | 'openai-direct' | 'mock';
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AiProviderInfo {
  provider: 'openai-compatible-gateway' | 'azure-openai' | 'openai-direct' | 'mock';
  configured: boolean;
  mockMode: boolean;
  model: string;
  baseUrl?: string;
  endpoint?: string;
}

/**
 * Obtiene la configuración e identidad del proveedor de IA activo.
 */
export function getAiProviderInfo(): AiProviderInfo {
  const isMockExplicit = process.env.AI_MOCK_MODE === 'true';

  // 1. OpenAI-Compatible Gateway (LiteLLM, Azure APIM, Cloudflare, Portkey, vLLM, etc.)
  const gatewayUrl = (process.env.OPENAI_BASE_URL || process.env.AI_GATEWAY_URL)?.trim();
  const gatewayKey = (process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY)?.trim();
  const gatewayModel = (process.env.OPENAI_MODEL || process.env.AI_GATEWAY_MODEL)?.trim() || 'gpt-4o';

  // 2. Azure OpenAI nativo
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const azureKey = process.env.AZURE_OPENAI_KEY?.trim();
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME?.trim() || 'gpt-4o';

  if (isMockExplicit) {
    return {
      provider: 'mock',
      configured: false,
      mockMode: true,
      model: gatewayUrl ? gatewayModel : azureDeployment,
      baseUrl: gatewayUrl,
    };
  }

  if (gatewayUrl) {
    return {
      provider: 'openai-compatible-gateway',
      configured: Boolean(gatewayKey || gatewayUrl),
      mockMode: false,
      model: gatewayModel,
      baseUrl: gatewayUrl,
    };
  }

  if (azureEndpoint && azureKey) {
    return {
      provider: 'azure-openai',
      configured: true,
      mockMode: false,
      model: azureDeployment,
      endpoint: azureEndpoint,
    };
  }

  if (gatewayKey) {
    return {
      provider: 'openai-direct',
      configured: true,
      mockMode: false,
      model: gatewayModel,
    };
  }

  return {
    provider: 'mock',
    configured: false,
    mockMode: true,
    model: 'gpt-4o-mock',
  };
}

/**
 * Parsea headers adicionales configurados en JSON (ej. para enrutamiento en LiteLLM o APIM).
 */
function parseCustomGatewayHeaders(): Record<string, string> {
  const raw = process.env.AI_GATEWAY_CUSTOM_HEADERS?.trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[AI Gateway] Error parseando AI_GATEWAY_CUSTOM_HEADERS como JSON:', err);
    return {};
  }
}

/**
 * Servicio para invocar modelos de IA mediante:
 * 1. Gateway compatible con OpenAI (OPENAI_BASE_URL + OPENAI_API_KEY)
 * 2. Azure OpenAI nativo (AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_KEY)
 * 3. Simulación local Mock (fallback si no hay claves o AI_MOCK_MODE=true)
 */
export async function generateChatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const info = getAiProviderInfo();

  // Modo Mock / Simulación
  if (info.provider === 'mock' || info.mockMode) {
    const lastUserMessage = [...options.messages].reverse().find((m) => m.role === 'user')?.content || 'Consulta';
    return {
      reply: `[Modo Simulación / Mock Local]\n\nRecibí tu consulta: "${lastUserMessage}".\n\n` +
        `Este es un mensaje generado automáticamente por BaseBFS en modo simulación.\n\n` +
        `Para usar un Gateway OpenAI-compatible:\n` +
        `  - Configura OPENAI_BASE_URL="https://tu-gateway.com/v1" y OPENAI_API_KEY en api/local.settings.json\n` +
        `  - Cambia AI_MOCK_MODE="false"\n\n` +
        `Para usar Azure OpenAI nativo:\n` +
        `  - Configura AZURE_OPENAI_ENDPOINT y AZURE_OPENAI_KEY en api/local.settings.json\n` +
        `  - Cambia AI_MOCK_MODE="false"`,
      isMock: true,
      provider: 'mock',
      model: `${info.model}-mock-local`,
      usage: {
        promptTokens: 25,
        completionTokens: 85,
        totalTokens: 110,
      },
    };
  }

  // Modo 1: OpenAI Compatible Gateway (LiteLLM, Azure APIM, Cloudflare AI Gateway, Portkey, vLLM, etc.)
  if (info.provider === 'openai-compatible-gateway' || info.provider === 'openai-direct') {
    const customHeaders = parseCustomGatewayHeaders();
    const client = new OpenAI({
      baseURL: info.baseUrl,
      apiKey: process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY || 'dummy-gateway-key',
      defaultHeaders: customHeaders,
    });

    const response = await client.chat.completions.create({
      model: info.model,
      messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
    });

    const reply = response.choices[0]?.message?.content || '';

    return {
      reply,
      isMock: false,
      provider: info.provider,
      model: response.model || info.model,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  // Modo 2: Azure OpenAI nativo
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.trim();
  const apiKey = process.env.AZURE_OPENAI_KEY!.trim();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME?.trim() || 'gpt-4o';
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() || '2024-08-01-preview';

  const client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion,
    deployment,
  });

  const response = await client.chat.completions.create({
    messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
    model: deployment,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1000,
  });

  const reply = response.choices[0]?.message?.content || '';

  return {
    reply,
    isMock: false,
    provider: 'azure-openai',
    model: response.model || deployment,
    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * Función helper de compatibilidad: verifica si la IA está lista con credenciales reales.
 */
export function isAzureOpenAiConfigured(): boolean {
  const info = getAiProviderInfo();
  return info.configured && !info.mockMode;
}
