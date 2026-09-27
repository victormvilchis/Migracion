import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BBVAAlert } from '../../componentsBBVATalent/BBVAAlert';
import { BBVAFormBackButton } from '../../componentsBBVATalent/BBVACrudForm';
import { CollaboratorForm } from '../../componentsBBVATalent/CollaboratorForm';
import { useCollaborator } from '../hooks/useCollaborators';

export const CollaboratorDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const query = useCollaborator(id);
  const item = query.data?.item;
  if (query.isLoading) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75 [.bbva-dark_&]:text-slate-400">Cargando colaborador...</div>;
  if (query.error || !item) return <BBVAAlert tone="error">{query.error ? (query.error as Error).message : 'Colaborador no encontrado.'}</BBVAAlert>;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-start">
        <BBVAFormBackButton onBack={() => navigate('/bbva/collaborators')} />
      </div>
      <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm [.bbva-dark_&]:border-slate-800 [.bbva-dark_&]:bg-slate-900/75">
        <CollaboratorForm
          selected={item}
          mode="view"
          onSubmit={() => undefined}
          onCancel={() => navigate('/bbva/collaborators')}
        />
      </div>
    </div>
  );
};
