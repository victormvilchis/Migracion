import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { BBVACatalogHeader } from '../../componentsBBVATalent/BBVACatalogHeader';
import { CatalogForm } from '../../componentsBBVATalent/CatalogForm';
import { useCatalogItem, useDeleteCatalogItem } from '../hooks/useCatalog';
import { catalogConfigs, type CatalogType } from '../types/catalog';

interface CatalogDetailPageProps {
  type: CatalogType;
  mode?: 'view' | 'delete';
}

export const CatalogDetailPage: React.FC<CatalogDetailPageProps> = ({ type, mode = 'view' }) => {
  const config = catalogConfigs[type];
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useCatalogItem(type, id);
  const deleteMutation = useDeleteCatalogItem(type);
  const [error, setError] = useState<string | null>(null);
  const item = query.data?.item;

  const remove = async () => {
    if (!id || !item) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(id);
      const feminine = config.singularArticle === 'la';
      navigate(config.route, {
        state: { message: `${feminine ? 'La' : 'El'} ${config.singular} fue ${feminine ? 'eliminada' : 'eliminado'} correctamente.` },
      });
    } catch (deleteError) {
      setError((deleteError as Error).message);
    }
  };

  if (query.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando registro...</div>;
  if (query.error || !item) return <BBVAAlert tone="error">{(query.error as Error)?.message || 'Registro no encontrado.'}</BBVAAlert>;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start">
        <BBVAFormBackButton onBack={() => navigate(config.route)} disabled={deleteMutation.isPending} />
      </div>
      <BBVACatalogHeader title={`${mode === 'delete' ? 'ELIMINAR' : 'VER'} ${config.singular.toUpperCase()}`} description={item.name.toUpperCase()} />
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
      <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <CatalogForm
          config={config}
          selected={item}
          mode={mode}
          saving={deleteMutation.isPending}
          onSubmit={() => undefined}
          onCancel={() => navigate(config.route)}
          onDelete={mode === 'delete' ? () => void remove() : undefined}
        />
      </div>
    </div>
  );
};
