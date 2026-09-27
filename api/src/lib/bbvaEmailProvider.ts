export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{ filename: string; contentType: string; content: Buffer }>;
}

export interface EmailProvider {
  isConfigured(): boolean;
  sendEmail(message: EmailMessage): Promise<{ messageId: string }>;
  statusMessage(): string;
}

export class UnconfiguredEmailProvider implements EmailProvider {
  isConfigured(): boolean { return false; }
  statusMessage(): string { return 'La integración con Outlook aún no está configurada.'; }
  async sendEmail(_message: EmailMessage): Promise<{ messageId: string }> {
    throw Object.assign(new Error(this.statusMessage()), { statusCode: 409, code: 'EMAIL_PROVIDER_NOT_CONFIGURED' });
  }
}
