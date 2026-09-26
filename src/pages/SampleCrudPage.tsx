import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { Card } from '../components/common/Card';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { 
  Database, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  User, 
  Server
} from 'lucide-react';

interface SampleItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdByEmail: string;
  createdAt: string;
}

export const SampleCrudPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Frontend');
  const [status, setStatus] = useState('Activo');

  // Query: Listar items
  const { data, isLoading, error } = useQuery({
    queryKey: ['sampleItems'],
    queryFn: () => fetchApi<{ items: SampleItem[]; storage: string; warning?: string }>('/items'),
  });

  // Mutación: Crear item
  const createMutation = useMutation({
    mutationFn: (newItem: { title: string; description: string; category: string; status: string }) =>
      fetchApi('/items', {
        method: 'POST',
        body: JSON.stringify(newItem),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sampleItems'] });
      setTitle('');
      setDescription('');
    },
  });

  // Mutación: Eliminar item
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/items/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sampleItems'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({ title, description, category, status });
  };

  const isSqlServer = data?.storage === 'sql-server';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-950">
              Gestión de Registros (CRUD SQL)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ejemplo de arquitectura conectando interfaz (React Query), servicios (Azure Functions) y base de datos (SQL Server).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500">Motor Activo:</span>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 ${
              isSqlServer
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            {isSqlServer ? 'SQL Server Local (Docker)' : 'Memoria Temporal (Fallback)'}
          </span>
        </div>
      </div>

      {data?.warning && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            {data.warning} Los datos se guardarán temporalmente hasta que inicies SQL Server con <code className="bg-white px-1 py-0.5 rounded text-amber-700">docker compose up -d</code>.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Creación */}
        <Card className="lg:col-span-1 h-fit">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" />
            Nuevo Registro
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 font-medium mb-1">Título *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Análisis de requerimientos"
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-950 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalle o notas de la tarea..."
                rows={3}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-950 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Categoría</label>
                <SearchableSelect
                  value={category}
                  onChange={setCategory}
                  options={[
                    { value: 'Frontend', label: 'Interfaz' },
                    { value: 'Backend', label: 'Servicios' },
                    { value: 'AI', label: 'Inteligencia artificial' },
                    { value: 'DevOps', label: 'DevOps' },
                    { value: 'General', label: 'General' },
                  ]}
                  ariaLabel="Categoría"
                  searchPlaceholder="Buscar categoría"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Estado</label>
                <SearchableSelect
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: 'Activo', label: 'Activo' },
                    { value: 'En Progreso', label: 'En progreso' },
                    { value: 'Completado', label: 'Completado' },
                  ]}
                  ariaLabel="Estado"
                  searchPlaceholder="Buscar estado"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>{createMutation.isPending ? 'Guardando...' : 'Crear Registro'}</span>
            </button>
          </form>
        </Card>

        {/* Lista de Registros */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Registros Guardados ({data?.items?.length || 0})
            </h3>
            <span className="text-xs text-slate-500">Actualizado vía React Query</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Cargando registros...</div>
          ) : error ? (
            <div className="p-6 text-center text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl">
              Error al consultar la API: {(error as Error).message}
            </div>
          ) : data?.items && data.items.length > 0 ? (
            <div className="space-y-2.5">
              {data.items.map((item) => (
                <Card key={item.id} hoverEffect className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-slate-950">{item.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                          {item.category}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          {item.status}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {item.createdByEmail}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-200">
              No hay registros todavía. Crea el primero desde el formulario.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
