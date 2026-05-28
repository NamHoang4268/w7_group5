import { useState, useEffect, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import Header from "./components/Header";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import Sidebar from "./components/Sidebar";
import { Bot } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

function generateId() {
  return "s-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem("geekbrain-sessions") || "[]");
  } catch { return []; }
}

function saveSessions(sessions) {
  localStorage.setItem("geekbrain-sessions", JSON.stringify(sessions));
}

function loadMessages(sessionId) {
  try {
    return JSON.parse(localStorage.getItem(`geekbrain-msgs-${sessionId}`) || "[]");
  } catch { return []; }
}

function saveMessages(sessionId, messages) {
  localStorage.setItem(`geekbrain-msgs-${sessionId}`, JSON.stringify(messages));
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 py-4">
      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
        <Bot size={16} />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-muted-foreground"
              style={{
                animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onQuickAsk }) {
  const suggestions = [
    "Who is the Team Platform lead?",
    "What was PaymentGW's total cost in Q1 2026?",
    "Is NotificationSvc healthy right now?",
    "Compare latency across all services",
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Bot size={32} className="text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        GeekBrain AI Assistant
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Ask about teams, services, policies, costs, incidents, and live system
        metrics. The agent autonomously decides which tools to use.
      </p>
      <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
        {suggestions.map((q) => (
          <button
            key={q}
            onClick={() => onQuickAsk(q)}
            className="text-left text-xs p-3 rounded-xl border border-border hover:bg-muted hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [sessions, setSessions] = useState(loadSessions);
  const [sessionId, setSessionId] = useState(() => {
    const saved = localStorage.getItem("geekbrain-active-session");
    if (saved) return saved;
    return generateId();
  });
  const [messages, setMessages] = useState(() => loadMessages(sessionId));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("offline");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("geekbrain-active-session", sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (!loading) {
      saveMessages(sessionId, messages);
      updateSessionMeta(sessionId, messages);
    }
  }, [messages, loading, sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const updateSessionMeta = (sid, msgs) => {
    setSessions((prev) => {
      const existing = prev.find((s) => s.id === sid);
      const lastUserMsg = [...msgs].reverse().find((m) => m.role === "user");
      const meta = {
        id: sid,
        lastMessage: lastUserMsg?.content || "New conversation",
        messageCount: msgs.length,
        updatedAt: Date.now(),
        createdAt: existing?.createdAt || Date.now(),
      };
      let updated;
      if (existing) {
        updated = prev.map((s) => (s.id === sid ? { ...s, ...meta } : s));
      } else if (msgs.length > 0) {
        updated = [meta, ...prev];
      } else {
        return prev;
      }
      updated.sort((a, b) => b.updatedAt - a.updatedAt);
      saveSessions(updated);
      return updated;
    });
  };

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) setStatus("healthy");
      else setStatus("error");
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleSend = async (text) => {
    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const botMsgIndex = { current: -1 };
    const updateBot = (updater) => {
      flushSync(() => {
        setMessages((prev) => {
          const copy = [...prev];
          if (botMsgIndex.current >= 0 && botMsgIndex.current < copy.length) {
            copy[botMsgIndex.current] = updater(copy[botMsgIndex.current]);
          }
          return copy;
        });
      });
    };

    const placeholderMsg = {
      role: "assistant",
      content: "",
      tools_used: [],
      sources: [],
      reasoning_steps: [],
      tool_calls: [],
      processing_time: null,
      streaming: true,
    };

    flushSync(() => {
      setMessages((prev) => {
        botMsgIndex.current = prev.length;
        return [...prev, placeholderMsg];
      });
    });

    try {
      await fetchEventSource(`${API_BASE}/query/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, session_id: sessionId }),
        onmessage(ev) {
          const data = JSON.parse(ev.data);
          switch (ev.event) {
            case "reasoning_delta":
              updateBot((msg) => {
                const steps = [...msg.reasoning_steps];
                const current = steps.find((s) => s.iteration === data.iteration && s._streaming);
                if (current) {
                  current.text = (current.text || "") + (data.text || "");
                } else {
                  steps.push({ iteration: data.iteration, text: data.text || "", tools_called: [], _streaming: true });
                }
                return { ...msg, reasoning_steps: steps };
              });
              break;
            case "reasoning":
              updateBot((msg) => {
                const steps = msg.reasoning_steps.filter((s) => s.iteration !== data.iteration);
                steps.push(data);
                return { ...msg, reasoning_steps: steps };
              });
              break;
            case "tool_start":
              updateBot((msg) => ({
                ...msg,
                tool_calls: [...msg.tool_calls, { ...data, success: null, result: null }],
              }));
              break;
            case "tool_result":
              updateBot((msg) => {
                const calls = [...msg.tool_calls];
                const idx = calls.findLastIndex(
                  (c) => c.tool_name === data.tool_name && c.result === null
                );
                if (idx >= 0) calls[idx] = data;
                else calls.push(data);
                return {
                  ...msg,
                  tool_calls: calls,
                  tools_used: [...new Set([...msg.tools_used, data.tool_name])],
                };
              });
              break;
            case "text_delta":
              updateBot((msg) => ({
                ...msg,
                content: (msg.content || "") + (data.text || ""),
              }));
              break;
            case "answer":
              updateBot((msg) => ({
                ...msg,
                content: data.answer || msg.content || "",
                sources: data.sources || [],
                tools_used: data.tools_used || msg.tools_used,
                streaming: false,
              }));
              break;
            case "done":
              updateBot((msg) => ({
                ...msg,
                processing_time: data.processing_time,
                streaming: false,
              }));
              break;
            case "error":
              updateBot((msg) => ({
                ...msg,
                content: `Error: ${data.message}`,
                streaming: false,
              }));
              break;
          }
        },
        onerror(err) {
          updateBot((msg) => ({
            ...msg,
            content: `Error: Connection failed. Make sure the backend is running.`,
            streaming: false,
          }));
          throw err;
        },
        openWhenHidden: true,
      });
    } catch (err) {
      if (botMsgIndex.current >= 0) {
        updateBot((msg) => ({
          ...msg,
          content: msg.content || `Error: ${err.message || "Stream failed"}`,
          streaming: false,
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = () => {
    const newId = generateId();
    setSessionId(newId);
    setMessages([]);
  };

  const handleSelectSession = (sid) => {
    if (sid === sessionId) return;
    setSessionId(sid);
    setMessages(loadMessages(sid));
  };

  const handleDeleteSession = (sid) => {
    localStorage.removeItem(`geekbrain-msgs-${sid}`);
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sid);
      saveSessions(updated);
      return updated;
    });
    if (sid === sessionId) {
      handleNewSession();
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        status={status}
        onNewSession={handleNewSession}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <aside className="w-72 border-r border-border bg-card overflow-hidden flex-shrink-0">
            <div className="p-3 border-b border-border">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Chat Sessions
              </h2>
            </div>
            <Sidebar
              sessions={sessions}
              activeSessionId={sessionId}
              onSelectSession={handleSelectSession}
              onNewSession={handleNewSession}
              onDeleteSession={handleDeleteSession}
            />
          </aside>
        )}

        <main className="flex-1 flex flex-col overflow-hidden">
          {messages.length === 0 && !loading ? (
            <EmptyState onQuickAsk={handleSend} />
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4">
              <div className="max-w-3xl mx-auto py-4">
                {messages.map((msg, i) => (
                  <ChatMessage key={i} message={msg} />
                ))}
                {loading && !messages.some((m) => m.streaming) && <TypingIndicator />}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}

          <ChatInput onSend={handleSend} loading={loading} />
        </main>
      </div>
    </div>
  );
}
