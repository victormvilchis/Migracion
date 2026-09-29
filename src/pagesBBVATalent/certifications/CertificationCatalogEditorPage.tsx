import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAButton } from '../../componentsBBVATalent/BBVAButton';
import { BBVACatalogHeader } from '../../componentsBBVATalent/BBVACatalogHeader';
import { CertificationCatalogForm } from '../../componentsBBVATalent/CertificationCatalogForm';
import { useCertificationCatalogItem, useCreateCertificationCatalogItem, useUpdateCertificationCatalogItem } from '../hooks/useCertificationCatalog';
import type { CertificationCatalogPayload } from '../types/certificationCatalog';

const route = '/bbva/admin/catalogs/certifications';

export const CertificationCatalogEditorPage: React.FC = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const query = useCertificationCatalogItem(id);
  const createMutation = useCreateCertificationCatalogItem();
  const updateMutation = useUpdateCertificationCatalogItem();
  const [error, setError] = useState<string | null>(null);
  const selected = query.data?.item ?? null;
  const saving = createMutation.isPending || updateMutation.isPending;

  const submit = async (payload: CertificationCatalogPayload) => {
    try {
      setError(null);
      if (editing && id) await updateMutation.mutateAsync({ id, payload });
      else await createMutation.mutateAsync(payload);
      navigate(route, { state: { message: `La certificación se ${editing ? 'actualizó' : 'agregó'} correctamente.` } });
    } catch (submitError) { setError((submitError as Error).message); }
  };

  if (editing && query.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Cargando certificación...</div>;
  if (editing && (query.error || !selected)) return <BBVAAlert tone="error">{(query.error as Error)?.message || 'Certificación no encontrada.'}</BBVAAlert>;
  if (editing && selected?.status === 'INACTIVE') return <div className="space-y-3 animate-fade-in"><BBVAButton variant="secondary" icon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => navigate(route)}>Regresar</BBVAButton><BBVAAlert tone="info">Esta certificación está inactiva. Actívala desde el listado para poder modificar su configuración.</BBVAAlert></div>;

  return <div className="space-y-3 animate-fade-in"><BBVAButton variant="secondary" icon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={() => navigate(route)}>Regresar</BBVAButton><BBVACatalogHeader title={editing?'EDITAR CERTIFICACIÓN':'NUEVA CERTIFICACIÓN'} description="CERTIFICACIONES" />{error && <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert>}<CertificationCatalogForm selected={selected} saving={saving} onSubmit={(payload) => void submit(payload)} onCancel={() => navigate(route)} /></div>;
};
