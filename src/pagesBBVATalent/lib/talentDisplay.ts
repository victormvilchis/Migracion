import type { Talent } from '../types/talent';

export function roleDisplay(talent: Talent): string {
  const parts = [talent.profile, talent.technologyProfile].filter(Boolean);
  return parts.length ? parts.join(' - ') : 'No disponible';
}

export function technologyDisplay(talent: Talent): string {
  if (!talent.currentTechnology) return 'No disponible';
  return talent.expertise ? `${talent.currentTechnology} - ${talent.expertise}` : talent.currentTechnology;
}

export function formatDate(value?: string | null): string {
  if (!value) return 'No disponible';
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleDateString('es-MX');
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
