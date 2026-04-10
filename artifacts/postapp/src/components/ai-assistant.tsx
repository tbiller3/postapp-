import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, Loader2, ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  role: "user" | "assistant" | "action";
  content: string;
}

interface AppContext {
  appName?: string;
  bundleId?: string;
  checklistTotal?: number;
  checklistDone?: number;
  pendingItems?: string[];
}

interface AiAssistantProps {
  appId?: number;
  appContext?: AppContext;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const QUICK_ACTIONS = [
  { label: "Readiness check", msg: "Check my overall submission readiness" },
  { label: "What's missing?", msg: "What's missing from my submission?" },
  { label: "Run pipeline", msg: "Run the full pipeline and show me the results" },
  { label: "Build status", msg: "Check my current build status" },
];

function formatMessage(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="bg-purple-950 text-purple-200 px-1 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function toolLabel(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AiAssistant({ appId, appContext }: AiAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages([]);
  }, [appId]);

  useEffect(() => {
    if (open && messages.length === 0) {
      let greeting: string;
      if (appContext?.appName) {
        const remaining = (appContext.checklistTotal ?? 0) - (appContext.checklistDone ?? 0);
        const pendingStr = appContext.pendingItems?.length
          ? `\n\nYou still have **${remaining}** item${remaining !== 1 ? "s" : ""} to complete:\n${appContext.pendingItems.slice(0, 5).map((p) => `• ${p}`).join("\n")}${appContext.pendingItems.length > 5 ? `\n• …and ${appContext.pendingItems.length - 5} more` : ""}`
          : "";
        greeting = `I'm your POSTAPP co-pilot. I can see you're working on **${appContext.appName}** — **${appContext.checklistDone}/${appContext.checklistTotal}** checklist items complete.${pendingStr}\n\nI can check readiness, fill metadata, trigger builds, and more. What would you like to do?`;
      } else {
        greeting = "I'm your POSTAPP co-pilot. I can check your submission readiness, fill in metadata, trigger builds, monitor progress, and guide you through the whole process.\n\nWhat would you like to do?";
      }
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [open, messages.length, appContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (overrideMsg?: string) => {
    const userMsg = (overrideMsg || input).trim();
    if (!userMsg || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await res.json();

      if (data.actions && data.actions.length > 0) {
        for (const action of data.actions) {
          setMessages((prev) => [...prev, { role: "action", content: toolLabel(action.tool) }]);
        }
      }

      if (data.ok && data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-2xl shadow-purple-900/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          title="POSTAPP Agent"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[380px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-5rem)] rounded-2xl shadow-2xl border border-white/10 bg-gray-950 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-700 to-purple-600 shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm leading-tight">POSTAPP Agent</div>
              <div className="text-purple-200 text-xs flex items-center gap-1">
                <Zap className="w-3 h-3" /> Can take actions
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors ml-auto"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.map((msg, i) => {
              if (msg.role === "action") {
                return (
                  <div key={i} className="flex items-center gap-2 text-xs text-purple-400 px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    {msg.content}
                  </div>
                );
              }
              return (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-tr-sm"
                        : "bg-gray-800 text-gray-100 rounded-tl-sm"
                    }`}
                  >
                    {msg.role === "assistant"
                      ? msg.content.split("\n").map((line, j) => (
                          <div key={j}>{line ? formatMessage(line) : <br />}</div>
                        ))
                      : msg.content}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="flex gap-1.5 px-4 pb-2 flex-wrap">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => sendMessage(qa.msg)}
                  disabled={loading}
                  className="text-xs px-2.5 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors disabled:opacity-40"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          <div className="shrink-0 px-3 pb-3 pt-2 border-t border-white/10 bg-gray-950">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me to check readiness, trigger a build…"
                className="resize-none min-h-[40px] max-h-[100px] text-sm bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500 rounded-xl"
                rows={1}
                disabled={loading}
              />
              <Button
                size="icon"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="h-10 w-10 shrink-0 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-gray-600 text-[10px] mt-1.5 text-center">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  );
}
