import React, { useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { Collaborator, CollaboratorPayload } from '../pagesBBVATalent/types/collaborator';

const fieldClass = 'h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';
const areaClass = 'w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[11px] text-slate-900 outline-none transition focus:border-blue-500 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-100';
const labelClass = 'mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.04em] text-slate-500 [.bbva-dark_&]:text-slate-400';

function values(item?: Collaborator | null): CollaboratorPayload {
  return { softtekCode: item?.softtekCode ?? '', corporateUser: item?.corporateUser ?? '', email: item?.email ?? '', firstName: item?.firstName ?? '', lastName: item?.lastName ?? '', profile: item?.profile ?? '', technologyProfile: item?.technologyProfile ?? '', currentTechnology: item?.currentTechnology ?? '', expertise: item?.expertise ?? '', startDate: item?.startDate ?? '', endDate: item?.endDate ?? '', hireDate: item?.hireDate ?? '', notes: item?.notes ?? '' };
}

export const CollaboratorForm: React.FC<{ selected?: Collaborator | null; saving?: boolean; onSubmit: (payload: CollaboratorPayload) => void; onCancel: () => void }> = ({ selected, saving, onSubmit, onCancel }) => {
  const { register, handleSubmit, reset } = useForm<CollaboratorPayload>({ defaultValues: values(selected) });
  useEffect(() => reset(values(selected)), [reset, selected]);
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Identificación</h3>
        <div className="grid gap-2 md:grid-cols-12">
          <label className="md:col-span-2"><span className={labelClass}>Código Softtek</span><input {...register('softtekCode')} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Usuario corporativo</span><input {...register('corporateUser')} className={fieldClass} /></label>
          <label className="md:col-span-4"><span className={labelClass}>Correo electrónico *</span><input {...register('email', { required: true })} type="email" className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Nombre *</span><input {...register('firstName', { required: true })} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Apellidos *</span><input {...register('lastName', { required: true })} className={fieldClass} /></label>
        </div>
      </section>
      <section className="space-y-2 border-t border-slate-200 pt-3 [.bbva-dark_&]:border-slate-800">
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Información profesional</h3>
        <div className="grid gap-2 md:grid-cols-12">
          <label className="md:col-span-4"><span className={labelClass}>Perfil</span><input {...register('profile')} className={fieldClass} /></label>
          <label className="md:col-span-3"><span className={labelClass}>Perfil tecnológico</span><input {...register('technologyProfile')} className={fieldClass} /></label>
          <label className="md:col-span-3"><span className={labelClass}>Tecnología actual</span><input {...register('currentTechnology')} className={fieldClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Expertise</span><select {...register('expertise')} className={fieldClass}><option value="">—</option><option value="TR">TR</option><option value="JR">JR</option><option value="STD">STD</option><option value="SR">SR</option></select></label>
        </div>
      </section>
      <section className="space-y-2 border-t border-slate-200 pt-3 [.bbva-dark_&]:border-slate-800">
        <h3 className="text-[11px] font-semibold text-slate-900 [.bbva-dark_&]:text-slate-100">Fechas</h3>
        <div className="grid gap-2 md:grid-cols-12">
          <label className="md:col-span-3"><span className={labelClass}>Fecha de alta</span><input {...register('startDate')} type="date" className={fieldClass} /></label>
          <label className="md:col-span-3"><span className={labelClass}>Vencimiento</span><input {...register('endDate')} type="date" className={fieldClass} /></label>
          <label className="md:col-span-3"><span className={labelClass}>Fecha de contratación</span><input {...register('hireDate')} type="date" className={fieldClass} /></label>
        </div>
      </section>
      <section className="border-t border-slate-200 pt-3 [.bbva-dark_&]:border-slate-800"><label><span className={labelClass}>Observaciones</span><textarea {...register('notes')} rows={3} className={areaClass} /></label></section>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 [.bbva-dark_&]:border-slate-800">
        <button type="button" onClick={onCancel} disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 [.bbva-dark_&]:border-slate-700 [.bbva-dark_&]:bg-slate-900 [.bbva-dark_&]:text-slate-200 [.bbva-dark_&]:hover:bg-slate-800"><X className="h-3.5 w-3.5" />Cancelar</button>
        <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><Save className="h-3.5 w-3.5" />{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  );
};
