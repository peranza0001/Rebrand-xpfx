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

export function isBrokerExecutionConfigured(): boolean {
  const provider = env.BROKER_EXECUTION_PROVIDER?.trim() ?? env.BROKER_API_URL?.trim() ?? 'custom';
  const hasApiKey = Boolean(env.BROKER_API_KEY?.trim()) && !env.BROKER_API_KEY?.trim().startsWith('placeholder');
  const hasUrl = Boolean(env.BROKER_API_URL?.trim()) && !env.BROKER_API_URL?.trim().startsWith('https://example.com');
  const hasAccount = Boolean(env.BROKER_ACCOUNT_ID?.trim()) && !env.BROKER_ACCOUNT_ID?.trim().startsWith('placeholder');
  const candidateConfig = provider && (provider !== 'none' && provider !== 'disabled');
  return Boolean(candidateConfig && hasUrl && (hasApiKey || hasAccount));
}

export function getIntegrationStatus() {
  return {
    sendgridConfigured: isSendGridConfigured(env.SENDGRID_API_KEY),
    smtpConfigured: isSmtpConfigured(),
    alchemyConfigured: isAlchemyConfigured(env.ALCHEMY_API_KEY),
    brokerConfigured: isBrokerExecutionConfigured(),
    liveTradingEnabled: Boolean(env.ENABLE_LIVE_TRADING),
  };
}

export default { isSendGridConfigured, isSmtpConfigured, isAlchemyConfigured, isBrokerExecutionConfigured, getIntegrationStatus };
