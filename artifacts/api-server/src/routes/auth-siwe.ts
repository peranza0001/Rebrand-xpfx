import { Router, type IRouter } from "express";
import { getAddress, verifyMessage } from "ethers";
import { randomBytes } from "node:crypto";
import { requireAuth } from "../lib/session";
import { newUuid } from "../lib/store";
import { persistConnectedWallet } from "../lib/db-persist";

const router: IRouter = Router();
const NONCE_TTL_MS = 5 * 60 * 1000;
const nonces = new Map<string, {
  userId: string;
  address: string;
  domain: string;
  uri: string;
  chainId: number;
  issuedAt: string;
  expirationTime: string;
}>();

function requestOrigin(req: Parameters<typeof requireAuth>[0]): { domain: string; uri: string } {
  const origin = req.get("origin");
  const protocol = req.protocol || "https";
  const host = req.get("host") || "localhost";
  const uri = origin || `${protocol}://${host}`;
  return { domain: new URL(uri).host, uri };
}

function buildMessage(input: { domain: string; address: string; uri: string; nonce: string; issuedAt: string; expirationTime: string; chainId: number }): string {
  return `${input.domain} wants you to sign in with your Ethereum account:\n${input.address}\n\nXpressPro FX wallet ownership verification.\n\nURI: ${input.uri}\nVersion: 1\nChain ID: ${input.chainId}\nNonce: ${input.nonce}\nIssued At: ${input.issuedAt}\nExpiration Time: ${input.expirationTime}`;
}

function parseMessage(message: string): Record<string, string> | null {
  const lines = message.split("\n");
  if (lines.length < 11 || !lines[1] || !lines[4]) return null;
  const fields: Record<string, string> = { domain: lines[0]!.split(" wants you")[0]!, address: lines[1]!, statement: lines[3]! };
  for (const line of lines.slice(5)) {
    const separator = line.indexOf(": ");
    if (separator > 0) fields[line.slice(0, separator)] = line.slice(separator + 2);
  }
  return fields;
}

router.post("/auth/siwe/nonce", requireAuth, (req, res) => {
  const addressInput = String(req.body?.address ?? "");
  let address: string;
  try { address = getAddress(addressInput); }
  catch { return res.status(400).json({ error: "A valid Ethereum address is required." }); }
  const { domain, uri } = requestOrigin(req);
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();
  const expirationTime = new Date(Date.now() + NONCE_TTL_MS).toISOString();
  nonces.set(nonce, { userId: req.userId!, address, domain, uri, chainId: 1, issuedAt, expirationTime });
  return res.json({ nonce, message: buildMessage({ domain, address, uri, nonce, issuedAt, expirationTime, chainId: 1 }), expiresAt: expirationTime });
});

router.post("/auth/siwe/verify", requireAuth, async (req, res) => {
  const nonce = String(req.body?.nonce ?? "");
  const message = String(req.body?.message ?? "");
  const signature = String(req.body?.signature ?? "");
  const record = nonces.get(nonce);
  if (!record || Date.parse(record.expirationTime) <= Date.now()) {
    nonces.delete(nonce);
    return res.status(401).json({ error: "SIWE nonce is invalid or expired." });
  }
  const parsed = parseMessage(message);
  if (!parsed || parsed.Nonce !== nonce || parsed.Domain !== undefined || parsed.domain !== record.domain || parsed.address.toLowerCase() !== record.address.toLowerCase() || parsed.URI !== record.uri || parsed.Version !== "1" || parsed["Chain ID"] !== String(record.chainId) || parsed["Issued At"] !== record.issuedAt || parsed["Expiration Time"] !== record.expirationTime) {
    return res.status(401).json({ error: "SIWE message does not match the issued challenge." });
  }
  try {
    const recovered = getAddress(verifyMessage(message, signature));
    if (recovered !== record.address) return res.status(401).json({ error: "SIWE signature does not match the wallet address." });
  } catch {
    return res.status(401).json({ error: "Invalid SIWE signature." });
  }
  nonces.delete(nonce);
  const wallet = {
    id: newUuid(), address: record.address, walletType: "metamask", balance: 0,
    currency: "ETH", connectionStatus: "public_address", connectedAt: new Date().toISOString(),
    provider: "self_custody", label: null, email: null, syncedProfile: null,
  };
  await persistConnectedWallet(wallet.id, req.userId!, { address: wallet.address, walletType: wallet.walletType, balance: 0, currency: wallet.currency, provider: wallet.provider, label: null, email: null, syncedProfile: null });
  return res.json({ verified: true, wallet });
});

export default router;