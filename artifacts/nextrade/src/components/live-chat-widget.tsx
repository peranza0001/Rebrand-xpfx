import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { apiPath, apiUrl } from "@/lib/api-url";

interface LiveChatMessage {
  id: string;
  senderName: string;
  content: string;
  createdAt: string;
  isFromUser: boolean;
  isBot?: boolean;
  escalated?: boolean;
  deliveryStatus?: "sending" | "sent" | "failed";
}

interface SessionResponse {
  user: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    country?: string | null;
  } | null;
}

interface HandoffResponse {
  ticketId: string;
  status: "queued";
  agentAvailable: boolean;
  supportNotification?: { delivered: boolean; fallbackUrl?: string };
}

interface VisitorProfile {
  name: string;
  email: string;
  country: string;
}

function appendUniqueMessages(previous: LiveChatMessage[], incoming: LiveChatMessage[]): LiveChatMessage[] {
  const existingIds = new Set(previous.map((item) => item.id));
  return [...previous, ...incoming.filter((item) => item.id && !existingIds.has(item.id))];
}

export function LiveChatWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [visitorProfile, setVisitorProfile] = useState<VisitorProfile | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [profileDraft, setProfileDraft] = useState<VisitorProfile>({ name: "", email: "", country: "" });
  const [handoff, setHandoff] = useState<HandoffResponse | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const csrfTokenRef = useRef<string | null>(null);
  const qc = useQueryClient();

  const loadCsrfToken = async () => {
    const response = await fetch(`${apiUrl}/api/csrf-token`, { credentials: 'include' });
    if (!response.ok) throw new Error('Live chat security initialization failed');
    const payload = await response.json() as { csrfToken?: string };
    if (!payload.csrfToken) throw new Error('Live chat security token was not returned');
    csrfTokenRef.current = payload.csrfToken;
  };

  useEffect(() => {
    if (!open) return;

    const fetchSession = async () => {
      setIsLoading(true);
      try {
        await loadCsrfToken();
        let sessionRes = await fetch(apiPath("/api/auth/session"), { credentials: 'include' });
        if (!sessionRes.ok) return;
        let sessionData: SessionResponse = await sessionRes.json();

        if (sessionData.user?.id) {
          const profile = {
            name: sessionData.user.fullName?.trim() || "",
            email: sessionData.user.email?.trim() || "",
            country: sessionData.user.country?.trim() || "",
          };
          setUserId(sessionData.user.id);
          setVisitorProfile(profile.name || profile.email ? profile : null);
          setProfileDraft(profile);
          window.localStorage.removeItem("xpfx_live_chat_profile");

          const res = await fetch(apiPath("/api/live-chat"), { credentials: 'include' });
          if (!res.ok) return;
          const chatData = await res.json();
          setMessages(Array.isArray(chatData) ? chatData : []);
          return;
        }

        // Public visitors use the isolated demo identity so chat works before signup,
        // but they still must complete the support profile form before starting.
        const demoRes = await fetch(`${apiUrl}/api/auth/demo`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfTokenRef.current ?? '',
          },
        });
        if (!demoRes.ok) return;
        const demoData: SessionResponse = await demoRes.json();
        if (!demoData.user?.id) return;
        setUserId(demoData.user.id);

        const res = await fetch(apiPath("/api/live-chat"), { credentials: 'include' });
        if (!res.ok) return;
        const chatData = await res.json();
        setMessages(Array.isArray(chatData) ? chatData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Live chat is temporarily unavailable');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSession();
  }, [open]);

  useEffect(() => {
    if (!userId) return;

    const socketClient = io(`${apiUrl}/live-chat`, {
      path: '/socket.io',
      withCredentials: true,
    });

    const refetchHistory = async () => {
      const response = await fetch(apiPath("/api/live-chat"), { credentials: 'include' });
      if (!response.ok) return;
      const history = await response.json();
      if (Array.isArray(history)) {
        setMessages((previous) => appendUniqueMessages(history as LiveChatMessage[], previous));
      }
    };

    socketClient.on('connect', () => {
      socketClient.emit('join_conversation', userId);
      void refetchHistory();
    });

    socketClient.on('message', (msg: LiveChatMessage) => {
      setMessages((prev) => appendUniqueMessages(prev, [msg]));
      if (!open && !msg.isFromUser) setUnreadCount((count) => count + 1);
    });

    socketClient.on('agent_joined', (payload: { senderName?: string; ticketId?: string }) => {
      setMessages((prev) => appendUniqueMessages(prev, [{
        id: `agent-joined-${payload.ticketId ?? Date.now()}`,
        senderName: payload.senderName ?? 'XpressPro FX Support',
        content: `${payload.senderName ?? 'A support representative'} joined this conversation and will continue helping you here.`,
        createdAt: new Date().toISOString(),
        isFromUser: false,
        isBot: false,
      }]));
    });

    socketClient.on('disconnect', () => {
      // ignore
    });

    return () => {
      socketClient.disconnect();
    };
  }, [open, userId]);

  useEffect(() => {
    if (open) setUnreadCount(0);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (requestedMessage?: string, retryMessageId?: string) => {
    const text = (requestedMessage ?? message).trim();
    if (!text || isSending) return;
    setMessage("");
    setError(null);
    setIsSending(true);
    const pendingId = retryMessageId ?? `pending-${Date.now()}`;
    if (retryMessageId) {
      setMessages((previous) => previous.map((item) => item.id === retryMessageId ? { ...item, deliveryStatus: "sending" } : item));
    } else {
      setMessages((previous) => [...previous, {
        id: pendingId,
        userId: userId ?? "",
        senderName: "You",
        content: text,
        createdAt: new Date().toISOString(),
        isFromUser: true,
        deliveryStatus: "sending",
      }]);
    }
    try {
      if (!csrfTokenRef.current) await loadCsrfToken();
  const res = await fetch(apiPath("/api/live-chat"), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfTokenRef.current ?? '',
        },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) {
        throw new Error('Unable to send message');
      }
      const result = await res.json();
      const nextMessages = [
        ...(Array.isArray(result?.userMessage) ? result.userMessage : [result?.userMessage]).filter(Boolean),
        ...(Array.isArray(result?.botReply) ? result.botReply : [result?.botReply]).filter(Boolean),
      ] as LiveChatMessage[];
      const sentUserMessage = nextMessages.find((item) => item.isFromUser);
      if (sentUserMessage) sentUserMessage.deliveryStatus = "sent";
      setMessages((previous) => previous.filter((item) => item.id !== pendingId));
      const handoff = result?.handoff as HandoffResponse | null | undefined;
      if (handoff) {
        setHandoff(handoff);
        nextMessages.push({
          id: `handoff-${handoff.ticketId}`,
          senderName: 'XpressPro FX Support',
          content: handoff.agentAvailable
            ? `Human support has been notified and your conversation is queued for an available representative. Ticket ${handoff.ticketId}.`
            : `Human support has been notified and your conversation is queued for the next available representative. Ticket ${handoff.ticketId}.`,
          createdAt: new Date().toISOString(),
          isFromUser: false,
          isBot: false,
          escalated: true,
        });
      }
      setMessages((prev) => appendUniqueMessages(prev, nextMessages));
      qc.invalidateQueries({ queryKey: ['getLiveChatMessages'] });
    } catch (err) {
      const fallbackMessage = err instanceof Error ? err.message : 'Unable to send message';
      setError(fallbackMessage);
      setMessages((previous) => previous.map((item) => item.id === pendingId ? { ...item, deliveryStatus: "failed" } : item));
    } finally {
      setIsSending(false);
    }
  };

  const handleIdentify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = profileDraft.name.trim();
    const email = profileDraft.email.trim();
    if (!name || !email || !email.includes("@")) {
      setError("Enter your name and a valid email so support can reply to you.");
      return;
    }
    if (!consentAccepted) {
      setError("Please agree to the support-chat data notice before starting.");
      return;
    }
    const profile = { name, email, country: profileDraft.country.trim() };
    try {
      if (!csrfTokenRef.current) await loadCsrfToken();
      const response = await fetch(apiPath("/api/live-chat/identify"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfTokenRef.current ?? "",
        },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error("We could not save your support details.");
      setVisitorProfile(profile);
      window.localStorage.setItem("xpfx_live_chat_profile", JSON.stringify(profile));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save your support details.");
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-70 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center hover:opacity-90 transition-all duration-200 hover:scale-105 pointer-events-auto"
        aria-label="Open live chat"
      >
        {unreadCount > 0 && !open && (
          <span className="absolute -right-1 -top-1 min-w-5 h-5 rounded-full bg-rose-600 px-1 text-[11px] font-semibold leading-5 text-white" aria-label={`${unreadCount} unread chat messages`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {open ? (
          <X className="w-6 h-6 text-primary-foreground" />
        ) : (
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-60 w-[min(22rem,calc(100vw-1.5rem))] h-[min(82vh,36rem)] max-h-[calc(100vh-5rem)] bg-card border border-card-border rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-primary">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">XpressPro FX Support</p>
              <p className="text-xs text-white/70">General support only · human handoff available</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="border-b border-border bg-muted px-3 py-2 text-[11px] leading-4 text-muted-foreground">
            This assistant provides general support only and cannot give financial or investment advice. For account-specific issues, you&apos;ll be connected with a human agent.
          </p>

          {!visitorProfile ? (
            <form onSubmit={handleIdentify} className="flex-1 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Before we start</p>
                <p className="text-xs text-muted-foreground mt-1">Share your name and email so a support representative can follow up.</p>
              </div>
              <input required value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })} placeholder="Your name" className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground" />
              <input required type="email" value={profileDraft.email} onChange={(event) => setProfileDraft({ ...profileDraft, email: event.target.value })} placeholder="Registered email" className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground" />
              <input value={profileDraft.country} onChange={(event) => setProfileDraft({ ...profileDraft, country: event.target.value })} placeholder="Country (optional)" className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground" />
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} className="mt-0.5" />
                <span>I agree that support may process this conversation to respond to my request. Do not include passwords, codes, payment details, or wallet secrets.</span>
              </label>
              <button type="submit" className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Start chat</button>
              {error && <p className="text-xs text-rose-600">{error}</p>}
            </form>
          ) : <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 pointer-events-auto">
            {!isLoading && messages.length === 0 && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-xl rounded-tl-none px-3 py-2 text-sm text-foreground max-w-[85%]">
                  Hello! Welcome to XpressPro FX support. How can I help you today?
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 items-start ${m.isFromUser ? "flex-row-reverse" : ""}`}
              >
                {!m.isFromUser && (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                    m.isFromUser
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none"
                  }`}
                >
                  <div>{m.content}</div>
                  {m.isFromUser && m.deliveryStatus && (
                    <div className="mt-1 text-[10px] opacity-75">
                      {m.deliveryStatus === "sending" ? "Sending..." : m.deliveryStatus === "failed" ? (
                        <button type="button" className="underline" onClick={() => { void handleSend(m.content, m.id); }}>Retry</button>
                      ) : "Sent"}
                    </div>
                  )}
                  {m.escalated && (
                    <div className="mt-2 text-[11px] font-medium uppercase tracking-wide text-amber-600">Escalated</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto" aria-label="Frequently asked questions">
            {["/faq account", "/faq funding", "/faq trading", "/faq security"].map((command) => (
              <button
                key={command}
                type="button"
                onClick={() => { void handleSend(command); }}
                disabled={isSending}
                className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary disabled:opacity-50"
              >
                {command.replace("/faq ", "")}
              </button>
            ))}
          </div>

          {handoff && (
            <div className="border-t border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <p className="font-semibold">{handoff.agentAvailable ? "Agent joining" : "In queue"}</p>
              <p>{handoff.agentAvailable ? "Support is typing..." : "We will notify you here when a representative joins."}</p>
              <p className="mt-1 font-medium">Ticket {handoff.ticketId}</p>
              {handoff.supportNotification?.delivered ? (
                <p className="mt-1 text-emerald-700 dark:text-emerald-300">Support team notified.</p>
              ) : handoff.supportNotification?.fallbackUrl ? (
                <a className="mt-1 inline-block font-medium underline" href={handoff.supportNotification.fallbackUrl}>Notify support by email</a>
              ) : null}
            </div>
          )}

          {/* Input */}
          {error && (
            <div className="border-b border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}
          <div className="p-3 border-t border-border flex gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pointer-events-auto">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => { void handleSend(); }}
              disabled={!message.trim() || isSending}
              className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          </>}
        </div>
      )}
    </>
  );
}
