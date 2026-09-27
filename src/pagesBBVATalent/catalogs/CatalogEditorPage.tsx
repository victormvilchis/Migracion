import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { CatalogForm } from '../../componentsBBVATalent/CatalogForm';
import { useCatalogItem, useCreateCatalogItem, useUpdateCatalogItem } from '../hooks/useCatalog';
import { catalogConfigs, type CatalogPayload, type CatalogType } from '../types/catalog';

export const CatalogEditorPage: React.FC<{ type: CatalogType }> = ({ type }) => {
  const config = catalogConfigs[type];
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const query = useCatalogItem(type, id);
  const createMutation = useCreateCatalogItem(type);
  const updateMutation = useUpdateCatalogItem(type);
  const [error, setError] = useState<string | null>(null);
  const selected = query.data?.item ?? null;
  const saving = createMutation.isPending || updateMutation.isPending;

  const submit = async (payload: CatalogPayload) => {
    setError(null);
    try {
      if (editing && id) await updateMutation.mutateAsync({ id, payload });
      else await createMutation.mutateAsync(payload);
      navigate(config.route, { state: { message: `${config.singularArticle === 'la' ? 'La' : 'El'} ${config.singular} se ${editing ? 'actualizó' : 'agregó'} correctamente.` } });
    } catch (submitError) { setError((submitError as Error).message); }
  };

  if (editing && query.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando registro...</div>;
  if (editing && (query.error || !selected)) return <BBVAAlert tone="error">{(query.error as Error)?.message || 'Registro no encontrado.'}</BBVAAlert>;
  if (editing && selected?.status === 'INACTIVE') return <div className="space-y-3 animate-fade-in"><BBVAButton variant="secondary" icon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => navigate(config.route)}>Regresar</BBVAButton><BBVAAlert tone="info">Este registro está inactivo. Actívalo desde el listado para poder modificarlo.</BBVAAlert></div>;

  return (
    <div className="space-y-3 animate-fade-in">
      <BBVAButton variant="secondary" icon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => navigate(config.route)}>Regresar</BBVAButton>
      {error && <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert>}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
        <CatalogForm config={config} selected={selected} saving={saving} onSubmit={(payload) => void submit(payload)} onCancel={() => navigate(config.route)} />
      </div>
    </div>
  );
};
