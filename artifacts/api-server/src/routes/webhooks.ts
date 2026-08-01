import { Router } from 'express';
import crypto from 'crypto';
import { usersByEmail, getUserData, newId } from '../lib/store';
import { logger } from '../lib/logger';
import { getChatNamespace } from '../lib/realtime';

const router = Router();

// POST /webhooks/inbound-email
// Accepts SendGrid inbound/email webhook payloads (JSON). If a signing key
// is configured via SENDGRID_SIGNING_KEY, attempt to verify the signature.
router.post('/webhooks/inbound-email', (req, res) => {
  const raw = req.body as Buffer | string | undefined;
  const timestamp = (req.get('x-twilio-email-event-webhook-timestamp') || req.get('x-sendgrid-timestamp') || '') as string;
  const signatureHeader = (req.get('x-twilio-email-event-webhook-signature') || req.get('x-sendgrid-signature') || '') as string;

  // Verify signature if configured.
  const signingKey = process.env.SENDGRID_SIGNING_KEY || '';
  if (signingKey && signatureHeader && timestamp && raw) {
    try {
      const payload = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
      const h = crypto.createHmac('sha256', signingKey);
      h.update(timestamp + payload);
      const expected = h.digest('base64');
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))) {
        logger.warn('[webhook] inbound-email signature mismatch');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    } catch (err) {
      logger.warn({ err }, '[webhook] signature verification failed');
      return res.status(400).json({ error: 'Signature verification error' });
    }
  }

  // Try to parse JSON body
  let parsed: any = null;
  try {
    const payload = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw || '');
    parsed = payload ? JSON.parse(payload) : null;
  } catch (err) {
    // Not JSON — fall back to raw text
    parsed = null;
  }

  // SendGrid / inbound providers sometimes send an array of events; normalize
  const events = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [{ text: Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw || '') }];

  for (const ev of events) {
    const from = (ev.from || ev.envelope?.from || ev.sender || ev.mail?.from || '').toLowerCase();
    const subject = ev.subject || ev.mail?.subject || '';
    const text = ev.text || ev.plain || ev.mail?.text || '';

    if (!from) {
      logger.info('[webhook] inbound-email missing from address');
      continue;
    }

    const userId = usersByEmail.get(from);
    if (!userId) {
      logger.info({ from, subject }, '[webhook] inbound-email: no matching user');
      continue;
    }

    const data = getUserData(userId);
    const msg = {
      id: newId('chat'),
      userId,
      senderName: `Email: ${from}`,
      content: `${subject ? subject + '\n\n' : ''}${text}`.slice(0, 10000),
      isFromUser: true,
      isBot: false,
      escalated: false,
      createdAt: new Date().toISOString(),
    };

    data.liveChat.push(msg);

    try {
      const ns = getChatNamespace();
      ns?.to(`conv:${userId}`).emit('message', msg);
    } catch (err) {
      logger.warn({ err }, '[webhook] failed to broadcast inbound email');
    }
  }

  // Respond 200 to acknowledge receipt; providers will retry on non-2xx.
  return res.status(200).json({ ok: true });
});

export default router;
