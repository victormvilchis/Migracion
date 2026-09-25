import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { generateChatCompletion, ChatMessage } from '../lib/azureOpenAiService.js';
import { getCurrentUser } from '../lib/authzLocal.js';

export async function sampleAiChatHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const user = getCurrentUser(request);

  try {
    const body = (await request.json()) as any;
    const incomingMessages = body?.messages;

    if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
      return {
        status: 400,
        jsonBody: { error: 'Se requiere un arreglo "messages" con al menos un mensaje.' },
      };
    }

    const messages: ChatMessage[] = incomingMessages.map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: String(m.content || ''),
    }));

    // Añadir contexto del sistema con el usuario
    const systemPrompt: ChatMessage = {
      role: 'system',
      content: `Eres el Asistente AI de Softtek BFS. Estás interactuando con el usuario ${user.name} (${user.email}). Responde de manera profesional, concisa y útil para operaciones bancarias y financieras o desarrollo de software.`,
    };

    const result = await generateChatCompletion({
      messages: [systemPrompt, ...messages],
      temperature: body?.temperature ?? 0.7,
      maxTokens: body?.maxTokens ?? 800,
    });

    return {
      status: 200,
      jsonBody: {
        reply: result.reply,
        isMock: result.isMock,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
      },
    };
  } catch (error: any) {
    context.error('[sampleAiChat] Error:', error?.message || error);
    return {
      status: 500,
      jsonBody: {
        error: 'Error al procesar la solicitud de IA.',
        details: error?.message || String(error),
      },
    };
  }
}

app.http('sampleAiChat', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ai/chat',
  handler: sampleAiChatHandler,
});
