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

export function getIntegrationStatus() {
  return {
    sendgridConfigured: isSendGridConfigured(env.SENDGRID_API_KEY),
    alchemyConfigured: isAlchemyConfigured(env.ALCHEMY_API_KEY),
  };
}
