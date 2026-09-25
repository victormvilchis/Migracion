import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { Card } from '../components/common/Card';
import { ServiceStatusBadge } from '../components/common/ServiceStatusBadge';
import { 
  Database, 
  Sparkles, 
  Terminal, 
  ArrowRight, 
  Layers,
  Code2,
  Bot
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { data: health, isLoading, isError, refetch } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetchApi('/health'),
    refetchInterval: 10000,
  });

  const sqlStatus = health?.services?.sqlServer?.status || (isLoading ? 'loading' : 'disconnected');
  const aiInfo = health?.services?.ai;
  const aiConfigured = aiInfo?.configured;
  const aiMockMode = aiInfo?.mockMode;
  const aiProvider = aiInfo?.provider || 'mock';
  const aiModel = aiInfo?.model || 'gpt-4o';
  const aiGatewayUrl = aiInfo?.gatewayUrl;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Welcome */}
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Starter Boilerplate Desacoplado</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
          Bienvenido al Entorno BaseBFS
        </h2>
        <p className="text-sm text-slate-500 max-w-3xl mt-2 leading-relaxed">
          Esta plantilla contiene la estructura, dependencias y arquitectura necesarias para desarrollar nuevas funcionalidades
          de manera 100% local. Cuando tu equipo termine de desarrollar, el código se puede transferir a{' '}
          <code className="text-blue-400 font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200">
            bfs_US
          </code>{' '}
          en minutos sin rehacer configuraciones.
        </p>
      </div>

      {/* Live Service Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Estado de Servicios Locales
          </h3>
          <button
            onClick={() => refetch()}
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            Actualizar estado
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ServiceStatusBadge
            label="Azure Functions (Backend)"
            status={isLoading ? 'loading' : isError ? 'error' : 'running'}
            subtitle="http://localhost:7071 (Node.js 22 v4)"
          />
          <ServiceStatusBadge
            label="SQL Server (Local)"
            status={
              sqlStatus === 'connected'
                ? 'connected'
                : sqlStatus === 'loading'
                ? 'loading'
                : 'disconnected'
            }
            subtitle={
              sqlStatus === 'connected'
                ? 'Conectado a dbo.SampleItems'
                : 'Ejecuta: docker compose up -d'
            }
          />
          <ServiceStatusBadge
            label={aiProvider === 'openai-compatible-gateway' ? 'AI Gateway (OpenAI Comp.)' : 'Azure OpenAI / Gateway'}
            status={aiConfigured ? 'connected' : aiMockMode ? 'mock' : 'disconnected'}
            subtitle={
              aiConfigured
                ? `${aiProvider === 'openai-compatible-gateway' ? `Gateway: ${aiGatewayUrl}` : 'Azure OpenAI'} (${aiModel})`
                : 'Modo simulación / mock activo'
            }
          />
        </div>
      </div>

      {/* Quick Start Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Pasos de Inicio para el Equipo</h4>
              <p className="text-xs text-slate-500">Cómo arrancar el proyecto desde cero</p>
            </div>
          </div>

          <ol className="space-y-3 text-xs text-slate-700">
            <li className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-slate-900 block">Levantar Base de Datos Local</strong>
                <code className="text-blue-400 font-mono text-[11px]">docker compose up -d</code>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Inicia SQL Server 2022 y Azurite en contenedores locales.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-slate-900 block">Configurar Gateway OpenAI o Azure OpenAI</strong>
                <p className="text-slate-500 text-[11px]">
                  Edita <code className="text-blue-400">api/local.settings.json</code> con <code className="text-indigo-700">OPENAI_BASE_URL</code> y <code className="text-indigo-700">OPENAI_API_KEY</code> para un Gateway OpenAI compatible, o con <code className="text-blue-700">AZURE_OPENAI_ENDPOINT</code> para Azure OpenAI. O mantén <code className="text-amber-400">AI_MOCK_MODE=true</code> para simulación local.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-slate-900 block">Ejecutar el Proyecto</strong>
                <code className="text-blue-400 font-mono text-[11px]">./start.sh</code>
                <span className="text-slate-500 text-[11px] ml-1.5">(o start.bat en Windows)</span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Inicia Azure Functions (puerto 7071) y Vite (puerto 5173) en paralelo.
                </p>
              </div>
            </li>
          </ol>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Módulos de Ejemplo Listos</h4>
              <p className="text-xs text-slate-500">Pruébalos para ver la arquitectura en acción</p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/crud"
              className="block p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-500/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-slate-900 group-hover:text-blue-400 transition-colors">
                    Gestión de Registros SQL
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 pl-6.5">
                Demuestra el patrón de repositorios, consultas SQL parametrizadas con <code className="text-slate-500">mssql</code> y caché con TanStack React Query.
              </p>
            </Link>

            <Link
              to="/ai"
              className="block p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-indigo-500/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-medium text-slate-900 group-hover:text-indigo-400 transition-colors">
                    Asistente de IA (Azure OpenAI)
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 pl-6.5">
                Demuestra llamadas a Azure OpenAI mediante Azure Functions, gestión de tokens, prompts del sistema y fallback transparente a mock.
              </p>
            </Link>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
              <div className="flex items-center gap-2 font-medium mb-1">
                <Code2 className="w-4 h-4" />
                <span>¿Cómo pasar lo construido a bfs_US?</span>
              </div>
              <p className="text-emerald-400/80 text-[11px]">
                Lee el archivo <strong className="text-emerald-700">GUIA_INTEGRACION_BFS_US.md</strong> en la raíz para ver la regla de nombres y el checklist de entrega.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
