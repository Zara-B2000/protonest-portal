"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Headset, X, Send, MessageCircle } from "lucide-react";
import type { Message } from "@/types";

interface Props {
  profileId: string;
}

export default function CustomerChatWidget({ profileId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Init or fetch conversation
  const initConversation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/messages/conversations", { method: "POST" });
      const data = await res.json();
      if (data.id) {
        setConversationId(data.id);
      }
    } catch (err) {
      console.error("Failed to init conversation:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await fetch(`/api/messages/conversations/${conversationId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        if (isOpen) {
          setUnreadCount(0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [conversationId, isOpen]);

  // Count unread when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const unread = messages.filter(
        (m) => m.sender_id !== profileId && !m.is_read
      ).length;
      setUnreadCount(unread);
    }
  }, [messages, isOpen, profileId]);

  // Init conversation on mount
  useEffect(() => {
    initConversation();
  }, [initConversation]);

  // Fetch messages initially and poll
  useEffect(() => {
    if (!conversationId) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId, fetchMessages]);

  // Scroll to bottom on new messages or open
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || sending) return;

    const body = input.trim();
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, body }),
      });
      const data = await res.json();
      if (data.id) {
        setMessages((prev) => [...prev, data]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setInput(body); // Restore input on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  let currentDate = "";
  messages.forEach((msg) => {
    const date = formatDate(msg.created_at);
    if (date !== currentDate) {
      currentDate = date;
      groupedMessages.push({ date, msgs: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].msgs.push(msg);
    }
  });

  return (
    <>
      {/* ── Floating bubble ────────────────────────────────────── */}
      <button
        id="chat-bubble"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
          bg-gradient-to-br from-brand-500 to-brand-900 text-white
          shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40
          flex items-center justify-center
          transition-all duration-300 hover:scale-110 active:scale-95"
        title="Chat with support"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Headset className="w-6 h-6" />
        )}
        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full
              bg-red-500 text-white text-[10px] font-bold
              flex items-center justify-center
              animate-pulse"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Chat panel ─────────────────────────────────────────── */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)]
          rounded-2xl overflow-hidden
          bg-white border border-slate-200
          shadow-2xl shadow-black/10
          flex flex-col
          transition-all duration-300 origin-bottom-right
          ${isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-90 translate-y-4 pointer-events-none"
          }`}
        style={{ height: "500px" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4
            bg-gradient-to-r from-brand-700 to-brand-900 text-white flex-shrink-0"
        >
          <div
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur
              flex items-center justify-center"
          >
            <Headset className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Protonest Support</h3>
            <p className="text-xs text-brand-100/90">We typically reply within minutes</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-slate-50/80">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-brand-500" />
              </div>
              <h4 className="font-semibold text-slate-700 mb-1">Start a conversation</h4>
              <p className="text-xs text-slate-400">
                Send us a message and we&apos;ll get back to you shortly.
              </p>
            </div>
          )}
          {groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              {group.msgs.map((msg) => {
                const isMine = msg.sender_id === profileId;
                return (
                  <div
                    key={msg.id}
                    className={`flex mb-2 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed
                        ${isMine
                          ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-br-md"
                          : "bg-white text-slate-700 border border-slate-200 rounded-bl-md shadow-sm"
                        }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isMine ? "text-brand-100/80" : "text-slate-400"
                        }`}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-200 bg-white flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="flex-1 text-sm px-4 py-2.5 rounded-full
              bg-slate-100 border-0 outline-none
              focus:ring-2 focus:ring-brand-500/30 focus:bg-white
              transition-all placeholder:text-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center
              bg-gradient-to-br from-brand-500 to-brand-700 text-white
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:shadow-md transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
