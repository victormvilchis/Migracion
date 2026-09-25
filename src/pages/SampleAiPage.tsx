import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { Card } from '../components/common/Card';
import { 
  Bot, 
  Send, 
  User, 
  Info, 
  Cpu,
  Network
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isMock?: boolean;
  model?: string;
  provider?: string;
}

export const SampleAiPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '¡Hola! Soy tu Asistente de IA en el entorno BaseBFS. Puedes conectarme a un Gateway compatible con OpenAI (LiteLLM, Azure APIM, Cloudflare, Kong) o a Azure OpenAI nativo. Si aún no tienes credenciales configuradas, responderé en modo de simulación automática.',
      isMock: true,
      model: 'gpt-4o-mock',
      provider: 'mock',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (newMessages: { role: string; content: string }[]) =>
      fetchApi<{ reply: string; isMock: boolean; provider: string; model: string; usage?: any }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: newMessages }),
      }),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          isMock: data.isMock,
          provider: data.provider,
          model: data.model,
        },
      ]);
    },
    onError: (err: any) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error al conectar con el servicio de IA: ${err.message}`,
          isMock: true,
          provider: 'error',
        },
      ]);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = inputPrompt.trim();
    if (!prompt || chatMutation.isPending) return;

    const userMessage: ChatMessage = { role: 'user', content: prompt };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInputPrompt('');

    chatMutation.mutate(
      updatedMessages.map((m) => ({ role: m.role, content: m.content }))
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950">
              Asistente AI (OpenAI Gateway / Azure OpenAI)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Endpoint <code className="text-indigo-400 font-mono text-xs">/api/ai/chat</code> con soporte para Gateway compatible con OpenAI, Azure OpenAI y Mock.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span className="text-slate-500">Configurable en:</span>
          <code className="text-indigo-700 font-mono text-[11px]">api/local.settings.json</code>
        </div>
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-indigo-950 block">¿Cómo configurar tu Gateway OpenAI o Azure OpenAI?</strong>
          <p className="text-indigo-700 text-[11px] leading-relaxed">
            Abre <code className="text-indigo-900 bg-indigo-50 px-1 py-0.5 rounded">api/local.settings.json</code> y configura cualquiera de las dos opciones:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-indigo-700 text-[11px] pt-1">
            <li>
              <strong>Opción A (Gateway OpenAI Compatible):</strong> Asigna <code className="text-indigo-950">OPENAI_BASE_URL="https://tu-gateway.com/v1"</code> y <code className="text-indigo-950">OPENAI_API_KEY="tu-key"</code>.
            </li>
            <li>
              <strong>Opción B (Azure OpenAI Nativo):</strong> Asigna <code className="text-indigo-950">AZURE_OPENAI_ENDPOINT</code> y <code className="text-indigo-950">AZURE_OPENAI_KEY</code>.
            </li>
            <li>
              Para activar cualquier proveedor real, cambia <code className="text-indigo-950">AI_MOCK_MODE</code> a <code className="text-indigo-950">"false"</code>.
            </li>
          </ul>
        </div>
      </div>

      {/* Chat Container */}
      <Card className="flex flex-col h-[520px] p-0 overflow-hidden border-slate-200">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isGateway = msg.provider === 'openai-compatible-gateway';
            const isAzure = msg.provider === 'azure-openai';

            return (
              <div
                key={index}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-400'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white/90 border border-slate-200 text-slate-900 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {!isUser && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex-wrap">
                      <span>{msg.model || 'AI Model'}</span>
                      {isGateway && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono flex items-center gap-1">
                          <Network className="w-3 h-3" />
                          OpenAI Gateway
                        </span>
                      )}
                      {isAzure && (
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded font-mono">
                          Azure OpenAI
                        </span>
                      )}
                      {msg.isMock && (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-mono">
                          Simulado / Mock
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {chatMutation.isPending && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white/90 border border-slate-200 text-slate-500 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                <span>Generando respuesta...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Escribe tu consulta para el asistente de IA..."
            disabled={chatMutation.isPending}
            className="flex-1 bg-white border border-slate-300/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-950 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || chatMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold p-2.5 sm:px-4 sm:py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 shrink-0 text-xs sm:text-sm"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </Card>
    </div>
  );
};
