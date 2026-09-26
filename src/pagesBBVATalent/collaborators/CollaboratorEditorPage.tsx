import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { CollaboratorForm } from '../../componentsBBVATalent/CollaboratorForm';
import { useCollaborator, useCreateCollaborator, useUpdateCollaborator } from '../hooks/useCollaborators';
import type { CollaboratorPayload } from '../types/collaborator';

export const CollaboratorEditorPage: React.FC = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const query = useCollaborator(id);
  const createMutation = useCreateCollaborator();
  const updateMutation = useUpdateCollaborator();
  const [error, setError] = useState<string | null>(null);
  const selected = query.data?.item ?? null;
  const saving = createMutation.isPending || updateMutation.isPending;

  const submit = async (payload: CollaboratorPayload) => {
    setError(null);
    try {
      if (editing && id) await updateMutation.mutateAsync({ id, payload });
      else await createMutation.mutateAsync(payload);
      navigate('/bbva/collaborators', { state: { message: editing ? 'El colaborador se actualizó correctamente.' : 'El colaborador se registró correctamente.' } });
    } catch (submitError) { setError((submitError as Error).message); }
  };

  if (editing && query.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:text-slate-400">Cargando colaborador...</div>;
  if (editing && (query.error || !selected)) return <BBVAAlert tone="error">{(query.error as Error)?.message || 'Colaborador no encontrado.'}</BBVAAlert>;

  return (
    <div className="space-y-3 animate-fade-in">
      <button type="button" onClick={() => navigate('/bbva/collaborators')} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><ArrowLeft className="h-3.5 w-3.5" />Regresar</button>
      {error && <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert>}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:shadow-none">
        <CollaboratorForm selected={selected} saving={saving} onSubmit={(payload) => void submit(payload)} onCancel={() => navigate('/bbva/collaborators')} />
      </div>
    </div>
  );
};
