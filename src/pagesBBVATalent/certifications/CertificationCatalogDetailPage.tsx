import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { BBVACatalogHeader } from '../../componentsBBVATalent/BBVACatalogHeader';
import { CertificationCatalogForm } from '../../componentsBBVATalent/CertificationCatalogForm';
import { useCertificationCatalogItem, useDeleteCertificationCatalogItem } from '../hooks/useCertificationCatalog';

const route = '/bbva/admin/catalogs/certifications';

interface CertificationCatalogDetailPageProps {
  mode?: 'view' | 'delete';
}

export const CertificationCatalogDetailPage: React.FC<CertificationCatalogDetailPageProps> = ({ mode = 'view' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useCertificationCatalogItem(id);
  const deleteMutation = useDeleteCertificationCatalogItem();
  const [error, setError] = useState<string | null>(null);
  const item = query.data?.item;

  const remove = async () => {
    if (!id || !item) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(id);
      navigate(route, { state: { message: 'La certificación fue eliminada correctamente.' } });
    } catch (deleteError) {
      setError((deleteError as Error).message);
    }
  };

  if (query.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando certificación...</div>;
  if (query.error || !item) return <BBVAAlert tone="error">{(query.error as Error)?.message || 'Certificación no encontrada.'}</BBVAAlert>;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start">
        <BBVAFormBackButton onBack={() => navigate(route)} disabled={deleteMutation.isPending} />
      </div>
      <BBVACatalogHeader title={mode === 'delete' ? 'ELIMINAR CERTIFICACIÓN' : 'CERTIFICACIÓN'} description={String(item.name ?? '').toUpperCase()} />
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
      <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <CertificationCatalogForm
          selected={item}
          mode={mode}
          saving={deleteMutation.isPending}
          onSubmit={() => undefined}
          onCancel={() => navigate(route)}
          onDelete={mode === 'delete' ? () => void remove() : undefined}
        />
      </div>
    </div>
  );
};
