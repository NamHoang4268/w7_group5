import { Brain, CircleDot, Plus, PanelLeftClose, PanelLeft, RefreshCw } from "lucide-react";
import { useState } from "react";

const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || "https://wgxe9ot493.execute-api.us-east-1.amazonaws.com/prod";
const API_KEY = import.meta.env.VITE_API_KEY || "";

export default function Header({ status, onNewSession, sidebarOpen, onToggleSidebar }) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleSyncKB = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${API_GATEWAY_URL}/sync`, {
        method: "POST",
        headers: { "x-api-key": API_KEY },
      });
      const data = await res.json();
      setSyncResult(res.ok ? "success" : "error");
      setTimeout(() => setSyncResult(null), 3000);
    } catch {
      setSyncResult("error");
      setTimeout(() => setSyncResult(null), 3000);
    } finally {
      setSyncing(false);
    }
  };
  const statusColor = {
    healthy: "bg-success",
    offline: "bg-destructive",
    error: "bg-warning",
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Brain size={18} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">GeekBrain</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Unified ReAct Agent
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CircleDot size={12} className={statusColor[status] ? "text-" + status : ""} />
          <span
            className={`w-2 h-2 rounded-full ${statusColor[status] || "bg-slate-300"}`}
          />
          <span className="capitalize">{status}</span>
        </div>
        <button
          onClick={handleSyncKB}
          disabled={syncing}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            syncResult === "success" ? "bg-green-100 text-green-700" :
            syncResult === "error" ? "bg-red-100 text-red-700" :
            "bg-muted hover:bg-slate-200"
          }`}
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : syncResult === "success" ? "Synced!" : "Sync KB"}
        </button>
        <button
          onClick={onNewSession}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-slate-200 transition-colors"
        >
          <Plus size={14} />
          New Chat
        </button>
      </div>
    </header>
  );
}
