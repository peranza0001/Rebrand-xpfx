import type http from 'http';
import { Server as IOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import { sessions, users, userData } from './store';
import { SESSION_COOKIE } from './session';
import { logger } from './logger';
import { getAllowedOrigins, normalizeOrigin } from './cors';

export async function initRealtime(server: http.Server) {
  const io = new IOServer(server, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        const normalizedOrigin = normalizeOrigin(origin);
        const allowedOrigins = getAllowedOrigins();
        if (normalizedOrigin && allowedOrigins.includes(normalizedOrigin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Origin not allowed by CORS'));
      },
      credentials: true,
    },
    path: '/socket.io',
  });

  // keep a module-level reference so other modules (HTTP routes) can broadcast
  // into namespaces without holding the server instance directly.
  // Consumers should call `getChatNamespace()` to obtain the `/live-chat` namespace.
  (globalThis as any).__xpfx_io = io;

  // Simple auth: read cookie header, unsign using cookie-parser's signedCookie
  io.use((socket: any, next: (err?: Error) => void) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || '';
      const cookies = Object.fromEntries(cookieHeader.split(';').map((pair: string) => {
        const [k, ...v] = pair.split('=');
        return [k?.trim(), v.join('=')];
      }).filter(([k]: [string | undefined]) => Boolean(k)));

      const raw = cookies[SESSION_COOKIE];
      if (!raw) {
        return next(new Error('Not authenticated'));
      }

      // Try to unsign using cookie-parser helper
      const secret = process.env.SESSION_SECRET || '';
      const signed = cookieParser.signedCookie(raw, secret);
      const sid = signed || raw;
      const rec = sessions.get(sid as string);
      const userId = rec?.userId;
      if (!userId) return next(new Error('Invalid session'));
      // attach userId to socket
      (socket as any).userId = userId;
      return next();
    } catch (err) {
      logger.warn({ err }, '[realtime] Auth failure');
      return next(new Error('Realtime auth error'));
    }
  });

  // Demo-trading namespace
  const demo = io.of('/demo-trading');
  demo.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    logger.info({ userId }, '[realtime] demo-trading connected');

    socket.on('join_instrument', (instrument: string) => {
      socket.join(`instrument:${instrument}`);
    });

    socket.on('disconnect', () => {
      logger.info({ userId }, '[realtime] demo-trading disconnected');
    });
  });

  // Live-chat namespace
  const chat = io.of('/live-chat');
  chat.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    logger.info({ userId }, '[realtime] live-chat connected');

    socket.on('join_admin_room', () => {
      socket.join('admins');
    });

    socket.on('join_conversation', (convId: string) => {
      socket.join(`conv:${convId}`);
    });

    socket.on('send_message', (payload: { convId: string; content: string }) => {
      const { convId, content } = payload;
      const stored = users.get(userId);
      const senderName = stored?.user.fullName || stored?.user.username || 'User';
      const msg = {
        id: `msg_${Math.random().toString(36).slice(2, 9)}`,
        userId,
        senderName,
        content: String(content).slice(0, 10000),
        isFromUser: true,
        isBot: false,
        escalated: false,
        createdAt: new Date().toISOString(),
      };
      // Persist into in-memory mailbox for now (store.liveChat)
      const ud = userData.get(userId);
      if (ud) {
        ud.liveChat.push({
          id: msg.id,
          userId,
          senderName: msg.senderName,
          content: msg.content,
          isFromUser: true,
          isBot: false,
          escalated: false,
          createdAt: msg.createdAt,
        });
      }

      chat.to(`conv:${convId}`).emit('message', msg);
      chat.to('admins').emit('message', msg);
    });

    socket.on('disconnect', () => {
      logger.info({ userId }, '[realtime] live-chat disconnected');
    });
  });

  // Initialize simulation engine to drive prices and order execution
  try {
    const sim = await import('./simulation-engine');
    sim.initSimulation(io, demo);
  } catch (err) {
    logger.warn({ err }, '[realtime] Failed to initialize simulation engine');
  }

  // Initialize price feed for forex, stocks, commodities
  try {
    const { initPriceFeed } = await import('./price-feed');
    initPriceFeed(io);
    logger.info('[realtime] Price feed initialized for forex, stocks, commodities');
  } catch (err) {
    logger.warn({ err }, '[realtime] Failed to initialize price feed');
  }

  logger.info('[realtime] Socket.IO initialized with /demo-trading, /live-chat, and /prices namespaces');
  return io;
}

export default initRealtime;

export function getChatNamespace() {
  const ioRef = (globalThis as any).__xpfx_io as IOServer | undefined | null;
  if (!ioRef) return null;
  return ioRef.of('/live-chat');
}
