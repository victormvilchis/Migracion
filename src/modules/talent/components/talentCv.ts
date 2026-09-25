import type { TalentCvDownload, TalentCvPayload } from '../types/talent';

const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
const maxBytes = 10 * 1024 * 1024;

export function validateCvFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  if (!allowedExtensions.some((ext) => lower.endsWith(ext))) {
    return 'Formato no permitido. Utiliza PDF, Word o PowerPoint.';
  }
  if (file.size > maxBytes) {
    return 'El CV no puede superar 10 MB.';
  }
  return null;
}

export async function fileToCvPayload(file: File): Promise<TalentCvPayload> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return {
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    base64: btoa(binary),
  };
}

function toBlob(document: TalentCvDownload): Blob {
  const binary = atob(document.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: document.contentType || 'application/octet-stream' });
}

export function downloadCvDocument(document: TalentCvDownload): void {
  const url = URL.createObjectURL(toBlob(document));
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = document.fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function viewCvDocument(document: TalentCvDownload): void {
  const url = URL.createObjectURL(toBlob(document));
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
