import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Download, Mail, RefreshCw, X } from 'lucide-react';
import { BBVAAlert } from './BBVAAlert';
import type { CertificationCommunication } from '../pagesBBVATalent/types/collaboratorCertification';

interface Props {
  open: boolean;
  communication: CertificationCommunication | null;
  certificationName: string;
  busy?: boolean;
  onClose: () => void;
  onPrepareEmail: (payload: { recipientEmail?: string; subject?: string; body?: string }) => Promise<CertificationCommunication>;
  onRegenerate: () => Promise<CertificationCommunication>;
}

function downloadPng(item: CertificationCommunication, certificationName: string) {
  const binary = atob(item.pngBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${certificationName.replace(/[^a-zA-Z0-9_-]+/g, '-') || 'certificacion'}-postal.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const CertificationCommunicationDialog: React.FC<Props> = ({ open, communication, certificationName, busy = false, onClose, onPrepareEmail, onRegenerate }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!communication) return;
    setRecipientEmail(communication.recipientEmail ?? '');
    setSubject(communication.emailSubject ?? '');
    setBody(communication.emailBody ?? '');
    setError(null);
  }, [communication]);

  if (!open || !communication || typeof document === 'undefined') return null;
  const prepared = communication.emailStatus === 'PREPARED';
  const copy = async (label: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(null), 1400); }
    catch { setError('No fue posible copiar al portapapeles.'); }
  };
  const prepare = async (saveCurrent: boolean) => {
    try {
      setError(null);
      const updated = await onPrepareEmail(saveCurrent ? { recipientEmail, subject, body } : {});
      setRecipientEmail(updated.recipientEmail ?? '');
      setSubject(updated.emailSubject ?? '');
      setBody(updated.emailBody ?? '');
    } catch (e) { setError((e as Error).message); }
  };
  const regenerate = async () => {
    try { setError(null); await onRegenerate(); }
    catch (e) { setError((e as Error).message); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[2700] overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="mx-auto my-4 w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_32px_100px_rgba(15,23,42,.38)]">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div><div className="text-[9px] font-semibold uppercase tracking-[.08em] text-blue-600">Comunicación de certificación</div><h3 className="mt-1 text-lg font-semibold text-slate-950">{certificationName}</h3><p className="mt-1 text-[10.5px] text-slate-500">Plantilla v{communication.postcardTemplateVersion} · {communication.context.replace(/_/g, ' ')}</p></div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
          <section className="border-b border-slate-100 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
            <img src={`data:image/png;base64,${communication.pngBase64}`} alt={`Postal de ${certificationName}`} className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadPng(communication, certificationName)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[11px] font-semibold text-white"><Download className="h-3.5 w-3.5" />Descargar PNG</button>
              <button type="button" onClick={() => void regenerate()} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[11px] font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Regenerar</button>
            </div>
          </section>

          <section className="space-y-4 p-5">
            {error ? <BBVAAlert tone="error" onClose={() => setError(null)}>{error}</BBVAAlert> : null}
            <BBVAAlert tone="warning">{communication.providerMessage} Puedes preparar el correo, copiar su contenido y descargar la postal; el sistema no lo marcará como enviado.</BBVAAlert>

            {!prepared ? (
              <div className="rounded-2xl border border-slate-200 p-4"><Mail className="h-5 w-5 text-blue-600" /><h4 className="mt-3 text-sm font-semibold text-slate-900">Preparar correo</h4><p className="mt-1 text-[10.5px] leading-5 text-slate-500">Carga asunto, mensaje y destinatario desde la plantilla correspondiente al resultado.</p><button type="button" onClick={() => void prepare(false)} disabled={busy} className="mt-4 h-9 rounded-xl bg-slate-900 px-4 text-[11px] font-semibold text-white disabled:opacity-50">{busy ? 'Preparando...' : 'Preparar correo'}</button></div>
            ) : (
              <div className="space-y-3">
                <label className="block"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase text-slate-500">Para</span><input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className="h-9 w-full rounded-xl border border-slate-300 px-3 text-[11px] outline-none focus:border-blue-500" placeholder="correo@dominio.com" /></label>
                <label className="block"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase text-slate-500">Asunto</span><div className="flex gap-2"><input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-[11px] outline-none focus:border-blue-500" /><button type="button" onClick={() => void copy('asunto', subject)} className="rounded-xl border border-slate-300 px-3 text-slate-600" title="Copiar asunto"><Copy className="h-3.5 w-3.5" /></button></div></label>
                <label className="block"><span className="mb-1.5 block text-[9.5px] font-semibold uppercase text-slate-500">Mensaje</span><textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[11px] leading-5 outline-none focus:border-blue-500" /><button type="button" onClick={() => void copy('mensaje', body)} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-[10px] font-semibold text-slate-600"><Copy className="h-3 w-3" />{copied === 'mensaje' ? 'Copiado' : 'Copiar mensaje'}</button></label>
                <div className="flex justify-end"><button type="button" onClick={() => void prepare(true)} disabled={busy} className="h-9 rounded-xl bg-blue-600 px-4 text-[11px] font-semibold text-white disabled:opacity-50">Guardar preparación</button></div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
};
