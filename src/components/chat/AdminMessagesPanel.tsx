"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Search, MessageCircle, ArrowLeft, User } from "lucide-react";
import type { Conversation, Message } from "@/types";

interface Props {
  profileId: string;
  initialConversations: Conversation[];
}

export default function AdminMessagesPanel({ profileId, initialConversations }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations");
      const data = await res.json();
      if (Array.isArray(data)) {
        setConversations(data);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async () => {
    if (!selectedConvId) return;
    try {
      const res = await fetch(`/api/messages/conversations/${selectedConvId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [selectedConvId]);

  // Poll conversations and messages
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConvId) fetchMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchMessages, selectedConvId]);

  // Fetch messages when selecting a conversation
  useEffect(() => {
    if (selectedConvId) {
      setLoadingMessages(true);
      fetchMessages().finally(() => setLoadingMessages(false));
    } else {
      setMessages([]);
    }
  }, [selectedConvId, fetchMessages]);

  // Scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when selecting
  useEffect(() => {
    if (selectedConvId) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [selectedConvId]);

  const handleSend = async () => {
    if (!input.trim() || !selectedConvId || sending) return;

    const body = input.trim();
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: selectedConvId, body }),
      });
      const data = await res.json();
      if (data.id) {
        setMessages((prev) => [...prev, data]);
        fetchConversations(); // Refresh sidebar
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setInput(body);
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

  const formatSidebarTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString())
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = conv.profiles?.full_name?.toLowerCase() || "";
    const email = conv.profiles?.email?.toLowerCase() || "";
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="flex h-[calc(100vh-7rem)] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ── Left Panel: Conversation List ──────────────────────── */}
      <div
        className={`w-full md:w-[340px] flex-shrink-0 border-r border-slate-200
          flex flex-col bg-white
          ${selectedConvId ? "hidden md:flex" : "flex"}`}
      >
        {/* Search header */}
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold text-lg text-slate-800 mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg
                bg-slate-100 border-0 outline-none
                focus:ring-2 focus:ring-brand-500/30 focus:bg-white
                transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <MessageCircle className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No conversations yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Customer messages will appear here
              </p>
            </div>
          )}
          {filteredConversations.map((conv) => {
            const isSelected = conv.id === selectedConvId;
            const hasUnread = (conv.unread_count || 0) > 0;
            const customerName =
              conv.profiles?.full_name || conv.profiles?.email || "Unknown";
            const lastMsg = conv.last_message;
            const initial = customerName.charAt(0).toUpperCase();

            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`w-full flex items-start gap-3 px-4 py-3.5
                  text-left transition-colors border-b border-slate-50
                  ${isSelected
                    ? "bg-brand-50 border-l-2 border-l-brand-500"
                    : "hover:bg-slate-50"
                  }`}
              >
                {/* Avatar */}
                <div
                  className={`w-11 h-11 rounded-full flex-shrink-0
                    flex items-center justify-center text-sm font-semibold
                    ${isSelected
                      ? "bg-brand-500 text-white"
                      : "bg-slate-200 text-slate-600"
                    }`}
                >
                  {initial}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-sm truncate ${
                        hasUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"
                      }`}
                    >
                      {customerName}
                    </span>
                    {lastMsg && (
                      <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                        {formatSidebarTime(lastMsg.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-xs truncate flex-1 ${
                        hasUnread ? "text-slate-700 font-medium" : "text-slate-400"
                      }`}
                    >
                      {lastMsg
                        ? lastMsg.sender_id === profileId
                          ? `You: ${lastMsg.body}`
                          : lastMsg.body
                        : "No messages yet"}
                    </p>
                    {hasUnread && (
                      <span
                        className="w-5 h-5 rounded-full bg-brand-500 text-white
                          text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                      >
                        {(conv.unread_count || 0) > 9
                          ? "9+"
                          : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right Panel: Chat View ─────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col bg-slate-50
          ${selectedConvId ? "flex" : "hidden md:flex"}`}
      >
        {!selectedConvId ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-500 mb-1">
              Select a conversation
            </h3>
            <p className="text-sm text-slate-400">
              Choose from your existing conversations or wait for new messages
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 bg-white flex-shrink-0">
              <button
                onClick={() => setSelectedConvId(null)}
                className="md:hidden text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-slate-800 truncate">
                  {selectedConv?.profiles?.full_name || selectedConv?.profiles?.email || "Customer"}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {selectedConv?.profiles?.email}
                </p>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
              {loadingMessages && (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
                </div>
              )}
              {!loadingMessages && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm text-slate-400">
                    No messages in this conversation yet.
                  </p>
                </div>
              )}
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide bg-slate-50 px-2">
                      {group.date}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  {group.msgs.map((msg) => {
                    const isMine = msg.sender_id === profileId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex mb-2.5 ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
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
            <div className="flex items-center gap-3 px-5 py-3.5 border-t border-slate-200 bg-white flex-shrink-0">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a reply..."
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
          </>
        )}
      </div>
    </div>
  );
}
