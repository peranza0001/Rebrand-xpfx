import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { loadCsrfToken, resolveApiBaseUrl } from '@/lib/api-url';

type SessionSummary = {
  userId: string;
  userName: string;
  userEmail: string;
  messages: Array<{ id: string; senderName: string; content: string; createdAt: string; isFromUser: boolean }>;
  lastMessageAt: string;
  escalated: boolean;
  unreadByAdmin: number;
};

export default function AdminLiveChat() {
  const apiUrl = resolveApiBaseUrl(import.meta.env.VITE_API_URL, window.location.origin);
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [selected, setSelected] = useState<SessionSummary | null>(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const csrfTokenRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const loadCsrfToken = async () => {
    const res = await fetch(`${apiUrl}/api/csrf-token`, { credentials: 'include' });
    if (!res.ok) throw new Error('Unable to initialize chat security.');
    const payload = await res.json() as { csrfToken?: string };
    if (!payload.csrfToken) throw new Error('Chat security token was not returned.');
    csrfTokenRef.current = payload.csrfToken;
  };

  useEffect(() => {
    void (async () => {
      const res = await fetch(`${apiUrl}/api/admin/live-chats`, { credentials: 'include' });
      if (res.ok) setSessions(await res.json());
    })();
  }, []);

  const selectedRef = useRef<SessionSummary | null>(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const socket = io(`${apiUrl}/live-chat`, { path: '/socket.io', withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_admin_room');
      // touch admin presence via heartbeat endpoint — optional
      void loadCsrfToken(apiUrl).then((csrfToken) => fetch(`${apiUrl}/api/admin/presence/heartbeat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken },
      })).catch(() => undefined);
    });

    socket.on('message', (msg: any) => {
      setSessions((prev) => {
        if (!prev) return prev;
        const copy = prev.slice();
        const idx = copy.findIndex((s) => s.userId === msg.userId);
        if (idx === -1) {
          const newSession: SessionSummary = {
            userId: msg.userId,
            userName: msg.senderName || 'Unknown User',
            userEmail: '',
            messages: [msg],
            lastMessageAt: msg.createdAt,
            escalated: msg.escalated ?? false,
            unreadByAdmin: msg.isFromUser ? 1 : 0,
          };
          return [newSession, ...copy];
        }
        copy[idx] = { ...copy[idx], messages: [...copy[idx].messages, msg], lastMessageAt: msg.createdAt };
        if (selectedRef.current && selectedRef.current.userId === msg.userId) {
          setSelected(copy[idx]);
        }
        return copy;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const openSession = (s: SessionSummary) => {
    setSelected(s);
    // join conversation room
    socketRef.current?.emit('join_conversation', s.userId);
  };

  const sendReply = async () => {
    if (!selected || !reply.trim() || isSending) return;
    setError(null);
    setIsSending(true);
    try {
      if (!csrfTokenRef.current) await loadCsrfToken();
      const res = await fetch(`${apiUrl}/api/admin/live-chats/${selected.userId}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfTokenRef.current ?? '',
        },
        body: JSON.stringify({ content: reply.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Unable to send reply.');
      const msg = await res.json();
      setReply('');
      setSessions((prev) => {
        if (!prev) return prev;
        return prev.map((p) => (p.userId === selected.userId ? { ...p, messages: [...p.messages, msg], lastMessageAt: msg.createdAt } : p));
      });
      setSelected((prev) => (prev ? { ...prev, messages: [...prev.messages, msg], lastMessageAt: msg.createdAt } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reply.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Live Chat (Admin)</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 bg-white rounded shadow p-2 h-[60vh] overflow-auto">
          <h3 className="font-medium mb-2">Conversations</h3>
          {!sessions && <div className="text-sm text-muted-foreground">Loading…</div>}
          {sessions?.map((s) => (
            <div key={s.userId} className="p-2 border-b cursor-pointer" onClick={() => openSession(s)}>
              <div className="font-medium">{s.userName || s.userEmail}</div>
              <div className="text-xs text-muted-foreground">{s.lastMessageAt}</div>
              {s.escalated && <div className="text-xs text-red-600">Escalated</div>}
            </div>
          ))}
        </div>
        <div className="col-span-3 bg-white rounded shadow p-4 h-[60vh] overflow-auto flex flex-col">
          {!selected && <div className="text-sm text-muted-foreground">Select a conversation to view messages</div>}
          {selected && (
            <>
              <div className="flex-1 overflow-auto space-y-3 mb-3">
                {selected.messages.map((m) => (
                  <div key={m.id} className={m.isFromUser ? 'text-left' : 'text-right'}>
                    <div className="text-xs text-muted-foreground">{m.senderName} — {new Date(m.createdAt).toLocaleString()}</div>
                    <div className="p-2 inline-block bg-gray-100 rounded">{m.content}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} className="w-full p-2 border rounded" rows={3} />
                <div className="flex justify-end mt-2">
                  <button onClick={sendReply} disabled={isSending || !reply.trim()} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">{isSending ? 'Sending...' : 'Send reply'}</button>
                </div>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
