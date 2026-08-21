import { env } from './env';

const SENDGRID_PLACEHOLDER_PREFIXES = ['sg_generated', 'sendgrid_generated', 'placeholder'];
const ALCHEMY_PLACEHOLDER_PREFIXES = ['alchemy_generated', 'alchemy_placeholder', 'placeholder'];

export function isSendGridConfigured(value?: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (SENDGRID_PLACEHOLDER_PREFIXES.some((prefix) => trimmed.toLowerCase().startsWith(prefix))) {
    return false;
  }
  return trimmed.startsWith('SG.') || trimmed.length >= 20;
}

export function isAlchemyConfigured(value?: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (ALCHEMY_PLACEHOLDER_PREFIXES.some((prefix) => trimmed.toLowerCase().startsWith(prefix))) {
    return false;
  }
  return trimmed.length >= 16;
}

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST?.trim() && env.SMTP_USER?.trim() && env.SMTP_PASS?.trim());
}

export function getIntegrationStatus() {
  return {
    sendgridConfigured: isSendGridConfigured(env.SENDGRID_API_KEY),
    smtpConfigured: isSmtpConfigured(),
    alchemyConfigured: isAlchemyConfigured(env.ALCHEMY_API_KEY),
  };
}

export default { isSendGridConfigured, isSmtpConfigured, isAlchemyConfigured, getIntegrationStatus };
