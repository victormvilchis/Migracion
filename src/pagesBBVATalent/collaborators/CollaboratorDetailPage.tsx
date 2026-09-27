import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { CollaboratorForm } from '../../componentsBBVATalent/CollaboratorForm';
import { useCollaborator, useDeleteCollaborator } from '../hooks/useCollaborators';

interface CollaboratorDetailPageProps {
  mode?: 'view' | 'delete';
}

export const CollaboratorDetailPage: React.FC<CollaboratorDetailPageProps> = ({ mode = 'view' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useCollaborator(id);
  const deleteMutation = useDeleteCollaborator();
  const [error, setError] = useState<string | null>(null);
  const item = query.data?.item;

  const remove = async () => {
    if (!id || !item) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/bbva/collaborators', { state: { message: 'El colaborador fue eliminado correctamente.' } });
    } catch (deleteError) {
      setError((deleteError as Error).message);
    }
  };

  if (query.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:text-slate-400">Cargando colaborador...</div>;
  if (query.error || !item) return <BBVAAlert tone="error">{query.error ? (query.error as Error).message : 'Colaborador no encontrado.'}</BBVAAlert>;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start">
        <BBVAFormBackButton onBack={() => navigate('/bbva/collaborators')} disabled={deleteMutation.isPending} />
      </div>
      {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
      <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <CollaboratorForm
          selected={item}
          mode={mode}
          saving={deleteMutation.isPending}
          onSubmit={() => undefined}
          onCancel={() => navigate('/bbva/collaborators')}
          onDelete={mode === 'delete' ? () => void remove() : undefined}
        />
      </div>
    </div>
  );
};
