import crypto from 'node:crypto';
import {
  communicationVariables,
  renderCommunicationTemplate,
  resolveCommunicationContext,
  type CertificationCommunicationRecord,
  type CertificationCommunicationSource,
} from './bbvaCertificationCommunicationDomain.js';
import { CertificationCommunicationRepository, type StoredCertificationCommunication } from './bbvaCertificationCommunicationRepository.js';
import { UnconfiguredEmailProvider, type EmailProvider } from './bbvaEmailProvider.js';
import { renderCertificationPostcardPng } from './bbvaCertificationPostcardRenderer.js';

const repository = new CertificationCommunicationRepository();

function valueOf(payload: unknown, key: string): unknown {
  return payload && typeof payload === 'object' && key in payload ? (payload as Record<string, unknown>)[key] : undefined;
}
function cleanText(value: unknown, max: number): string | null {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
}
function accentFor(_source: CertificationCommunicationSource, fallback: string | null): string | null {
  return fallback ?? '#1464A5';
}

function asRecord(stored: StoredCertificationCommunication, provider: EmailProvider, overrides?: { recipientEmail?: string | null; ccEmails?: string[] }): CertificationCommunicationRecord {
  return {
    id: stored.id,
    certificationRecordId: stored.certificationRecordId,
    attemptId: stored.attemptId,
    cycleNumber: stored.cycleNumber,
    context: stored.context,
    postcardTemplateId: stored.postcardTemplateId,
    postcardTemplateVersion: stored.postcardTemplateVersion,
    pngBase64: stored.pngData.toString('base64'),
    recipientEmail: overrides?.recipientEmail !== undefined ? overrides.recipientEmail : stored.recipientEmail,
    ccEmails: overrides?.ccEmails ?? [],
    emailStatus: stored.emailStatus,
    emailTemplateId: stored.emailTemplateId,
    emailTemplateVersion: stored.emailTemplateVersion,
    emailSubject: stored.emailSubject,
    emailBody: stored.emailBody,
    generatedAt: stored.generatedAt,
    providerConfigured: provider.isConfigured(),
    providerMessage: provider.statusMessage(),
  };
}

export class CertificationCommunicationService {
  constructor(private readonly emailProvider: EmailProvider = new UnconfiguredEmailProvider()) {}

  private async presentationRecipients(collaboratorId: string, actorEmail: string, recipientEmail: string | null): Promise<{ recipientEmail: string | null; ccEmails: string[] }> {
    const cc = await repository.automaticCc(collaboratorId, actorEmail);
    const recipientKey = String(recipientEmail ?? '').trim().toLocaleLowerCase('en-US');
    const seen = new Set<string>();
    const ccEmails = cc.filter((email) => {
      const key = email.toLocaleLowerCase('en-US');
      if (!key || key === recipientKey || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { recipientEmail, ccEmails };
  }

  async generate(collaboratorId: string, recordId: string, payload: unknown, actorEmail: string): Promise<CertificationCommunicationRecord | null> {
    const attemptId = String(valueOf(payload, 'attemptId') ?? '').trim();
    if (!attemptId) throw Object.assign(new Error('Selecciona un intento real para generar la postal.'), { statusCode: 400 });
    const regenerate = valueOf(payload, 'regenerate') === true;
    const source = await repository.source(collaboratorId, recordId, attemptId);
    if (!source) return null;

    const context = resolveCommunicationContext(source);
    const standardKey = `ATTEMPT:${attemptId}:POSTCARD`;
    if (!regenerate) {
      const existing = await repository.findByIdempotencyKey(standardKey);
      if (existing) {
        const recipients = await this.presentationRecipients(collaboratorId, actorEmail, source.recipientEmail);
        return asRecord(existing, this.emailProvider, recipients);
      }
    }

    const template = await repository.postcardTemplate(source.certificationId, context);
    if (!template) throw Object.assign(new Error('No existe una plantilla activa para generar la postal.'), { statusCode: 409 });
    const variables = communicationVariables(source);
    const png = renderCertificationPostcardPng({
      eyebrow: renderCommunicationTemplate(template.eyebrowTemplate, variables),
      title: renderCommunicationTemplate(template.titleTemplate, variables),
      message: renderCommunicationTemplate(template.messageTemplate, variables),
      fullName: variables.fullName,
      certificationName: variables.certificationName,
      resultLabel: variables.result,
      attemptLabel: source.maxAttempts ? `${variables.attemptNumber} / ${variables.maxAttempts}` : variables.attemptNumber,
      dateLabel: variables.attemptDate,
      accent: accentFor(source, template.accent),
    });

    const created = await repository.create({
      recordId,
      attemptId,
      cycleNumber: source.currentCycle,
      context,
      template,
      pngData: png,
      recipientEmail: source.recipientEmail,
      idempotencyKey: regenerate ? `REGEN:${attemptId}:${crypto.randomUUID()}` : standardKey,
      actorEmail,
    });
    const recipients = await this.presentationRecipients(collaboratorId, actorEmail, source.recipientEmail);
    return asRecord(created, this.emailProvider, recipients);
  }

  async get(collaboratorId: string, recordId: string, communicationId: string, actorEmail: string): Promise<CertificationCommunicationRecord | null> {
    const item = await repository.findById(recordId, communicationId);
    if (!item) return null;
    if (!item.attemptId) return asRecord(item, this.emailProvider);
    const source = await repository.source(collaboratorId, recordId, item.attemptId);
    if (!source) return asRecord(item, this.emailProvider);
    const recipients = await this.presentationRecipients(collaboratorId, actorEmail, source.recipientEmail);
    return asRecord(item, this.emailProvider, recipients);
  }

  async prepareEmail(collaboratorId: string, recordId: string, communicationId: string, payload: unknown, actorEmail: string): Promise<CertificationCommunicationRecord | null> {
    const communication = await repository.findById(recordId, communicationId);
    if (!communication?.attemptId) return null;
    const source = await repository.source(collaboratorId, recordId, communication.attemptId);
    if (!source) return null;
    const template = await repository.emailTemplate(source.certificationId, communication.context);
    if (!template) throw Object.assign(new Error('No existe una plantilla activa de correo para este resultado.'), { statusCode: 409 });
    const variables = communicationVariables(source);
    const defaultSubject = `Resultados de ${source.certificationName}`;
    const defaultBody = renderCommunicationTemplate(template.bodyTemplate, variables).replace(/\\n/g, '\n');
    const recipientEmail = source.recipientEmail;
    if (!recipientEmail) throw Object.assign(new Error('El colaborador no tiene correo Softtek registrado. Completa ese dato antes de preparar la comunicación.'), { statusCode: 409 });
    const subject = cleanText(valueOf(payload, 'subject'), 300) ?? defaultSubject;
    const body = cleanText(valueOf(payload, 'body'), 12000) ?? defaultBody;
    const prepared = await repository.prepareEmail({ recordId, communicationId, template, recipientEmail, subject, body });
    if (!prepared) return null;
    const recipients = await this.presentationRecipients(collaboratorId, actorEmail, recipientEmail);
    return asRecord(prepared, this.emailProvider, recipients);
  }
}
