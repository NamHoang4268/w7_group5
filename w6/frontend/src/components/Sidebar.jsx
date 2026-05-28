import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";

function SessionItem({ session, isActive, onClick, onDelete }) {
  const preview = session.lastMessage || "New conversation";
  const date = new Date(session.updatedAt);
  const timeStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-lg transition-all group relative",
        isActive
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted border border-transparent"
      )}
    >
      <p className="text-sm font-medium truncate text-foreground pr-6">
        {preview}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[11px] text-muted-foreground">
          {timeStr}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {session.messageCount || 0} msgs
        </span>
      </div>
      <span
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 hover:text-red-600 text-muted-foreground transition-all"
      >
        <Trash2 size={12} />
      </span>
    </button>
  );
}

export default function Sidebar({ sessions, activeSessionId, onSelectSession, onNewSession, onDeleteSession }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-2">
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:bg-muted hover:border-primary/30 transition-all text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus size={14} />
          New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1 p-2 pt-0">
        {(!sessions || sessions.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
            <MessageSquare size={32} className="mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          sessions.map((s) => (
            <SessionItem
              key={s.id}
              session={s}
              isActive={activeSessionId === s.id}
              onClick={() => onSelectSession(s.id)}
              onDelete={() => onDeleteSession(s.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
