import path from 'node:path';
import {
  TALENT_STAGES,
  TALENT_TYPES,
  type TalentCvInput,
  type TalentHistoryRecord,
  type TalentInput,
  type TalentRecord,
  type TalentStage,
  type TalentType,
} from '../domain/talent.js';
import { TalentRepository } from '../infrastructure/talentRepository.js';

const repository = new TalentRepository();
const allowedCvExtensions = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx']);
const maxCvBytes = 10 * 1024 * 1024;

function cleanText(value: unknown, maxLength: number): string | null {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, maxLength) : null;
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  const text = cleanText(value, maxLength);
  if (!text) throw new Error(`${field} es obligatorio.`);
  return text;
}

function normalizeType(value: unknown): TalentType {
  const type = String(value ?? '').trim().toUpperCase() as TalentType;
  if (!TALENT_TYPES.includes(type)) throw new Error(`Tipo de talento inválido. Valores permitidos: ${TALENT_TYPES.join(', ')}.`);
  return type;
}

function normalizeStage(value: unknown, type: TalentType): TalentStage {
  const fallback = type === 'ACADEMY' ? 'ACADEMY' : 'REGISTERED';
  const stage = String(value ?? fallback).trim().toUpperCase() as TalentStage;
  if (!TALENT_STAGES.includes(stage)) throw new Error(`Etapa inválida. Valores permitidos: ${TALENT_STAGES.join(', ')}.`);
  if (stage === 'CONVERTED') throw new Error('La conversión a colaborador se realizará desde el flujo de Colaboradores.');
  return stage;
}

function normalizeDate(value: unknown, field: string, required = false): string | null {
  const candidate = String(value ?? '').trim();
  if (!candidate) {
    if (required) throw new Error(`${field} es obligatorio.`);
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(Date.parse(`${candidate}T00:00:00Z`))) {
    throw new Error(`${field} debe tener formato YYYY-MM-DD.`);
  }
  return candidate;
}

function normalizePayload(payload: any): TalentInput {
  const talentType = normalizeType(payload?.talentType);
  const email = requiredText(payload?.email, 'El correo electrónico', 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El correo electrónico no tiene un formato válido.');

  const firstName = requiredText(payload?.firstName, 'El nombre', 120);
  const lastName = requiredText(payload?.lastName, 'Los apellidos', 180);
  const softtekCode = cleanText(payload?.softtekCode, 80)?.toUpperCase() ?? null;
  const profile = cleanText(payload?.profile, 120);
  const currentTechnology = cleanText(payload?.currentTechnology, 120);

  if (talentType === 'ACADEMY') {
    if (!softtekCode) throw new Error('El Código Softtek es obligatorio para Academia.');
    if (!profile) throw new Error('El perfil es obligatorio para Academia.');
    if (!currentTechnology) throw new Error('La tecnología es obligatoria para Academia.');
  }

  const platformStartDate = normalizeDate(payload?.platformStartDate, 'Inicio de vigencia');
  const platformEndDate = normalizeDate(payload?.platformEndDate, 'Vencimiento');
  if (platformStartDate && platformEndDate && platformEndDate < platformStartDate) {
    throw new Error('El vencimiento no puede ser anterior al inicio de vigencia.');
  }

  return {
    talentType,
    softtekCode,
    corporateUser: cleanText(payload?.corporateUser, 100)?.toUpperCase() ?? null,
    email,
    firstName,
    lastName,
    profile,
    technologyProfile: cleanText(payload?.technologyProfile, 120),
    currentTechnology,
    expertise: cleanText(payload?.expertise, 40)?.toUpperCase() ?? null,
    stage: normalizeStage(payload?.stage, talentType),
    active: payload?.active === undefined ? true : Boolean(payload.active),
    platformStartDate,
    platformEndDate,
    hireDate: normalizeDate(payload?.hireDate, 'Fecha de contratación'),
    entryDate: normalizeDate(payload?.entryDate, 'Fecha de alta en Talent Bank', true) as string,
    notes: cleanText(payload?.notes, 2000),
  };
}

function normalizeCv(payload: any): TalentCvInput {
  const fileName = requiredText(payload?.fileName, 'El nombre del archivo', 255);
  const contentType = cleanText(payload?.contentType, 150) || 'application/octet-stream';
  const extension = path.extname(fileName).toLowerCase();
  if (!allowedCvExtensions.has(extension)) throw new Error('Formato no permitido. Utiliza PDF, Word o PowerPoint.');

  const base64 = requiredText(payload?.base64, 'El contenido del CV', 20_000_000);
  let content: Buffer;
  try {
    content = Buffer.from(base64, 'base64');
  } catch {
    throw new Error('El contenido del CV no es válido.');
  }
  if (!content.length) throw new Error('El CV está vacío.');
  if (content.length > maxCvBytes) throw new Error('El CV no puede superar 10 MB.');

  return {
    fileName,
    contentType,
    fileExtension: extension,
    fileSizeBytes: content.length,
    content,
  };
}

export class TalentService {
  list(): Promise<TalentRecord[]> { return repository.list(); }
  get(id: string): Promise<TalentRecord | null> { return repository.findById(id); }
  create(payload: any, actorEmail: string): Promise<TalentRecord> { return repository.create(normalizePayload(payload), actorEmail); }
  update(id: string, payload: any, actorEmail: string): Promise<TalentRecord | null> { return repository.update(id, normalizePayload(payload), actorEmail); }

  updateStage(id: string, stageValue: unknown, actorEmail: string): Promise<TalentRecord | null> {
    const stage = String(stageValue ?? '').trim().toUpperCase() as TalentStage;
    if (!TALENT_STAGES.includes(stage)) throw new Error(`Etapa inválida. Valores permitidos: ${TALENT_STAGES.join(', ')}.`);
    if (stage === 'CONVERTED') throw new Error('La conversión a colaborador se realizará desde el flujo de Colaboradores.');
    return repository.updateStage(id, stage, actorEmail);
  }

  delete(id: string): Promise<boolean> { return repository.delete(id); }
  history(id: string): Promise<TalentHistoryRecord[]> { return repository.listHistory(id); }
  saveCv(id: string, payload: any, actorEmail: string) { return repository.saveCv(id, normalizeCv(payload), actorEmail); }
  getCv(id: string) { return repository.getCv(id); }
}
