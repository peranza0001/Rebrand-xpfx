/**
 * Public-wallet-only policy: the application never stores or handles wallet
 * credential material such as seed phrases or private keys. The UI and API
 * accept only public wallet addresses for connection and persistence.
 */

export function encryptCredential(_plaintext: string): string {
  throw new Error(
    "Wallet credential encryption is disabled. This application stores only public wallet addresses and never accepts seed phrases or private keys.",
  );
}

export function decryptCredential(value: string): string {
  return value;
}

export function isEncryptedCredential(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("enc:v1:");
}

export function isEncryptionAvailable(): boolean {
  return false;
}
