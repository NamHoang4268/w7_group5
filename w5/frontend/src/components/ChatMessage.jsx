import { Bot, User, Clock, Wrench, FileText, ChevronDown, ChevronRight, AlertCircle, Database, Search, Server, Activity, Users, GitCompare, Brain, CheckCircle, XCircle, Lightbulb, Loader } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

const TOOL_ICONS = {
  retrieve_knowledge: Search,
  query_database: Database,
  get_service_metrics: Activity,
  get_service_status: Server,
  list_services: Server,
  get_incident_history: AlertCircle,
  get_team_info: Users,
  compare_services: GitCompare,
};

function ToolBadge({ name }) {
  const Icon = TOOL_ICONS[name] || Wrench;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Icon size={12} />
      {name.replace(/_/g, " ")}
    </span>
  );
}

function SourceBadge({ name }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
      <FileText size={12} />
      {name}
    </span>
  );
}

function ReasoningStep({ step }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-l-2 border-l-violet-400 pl-3 py-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-start gap-1.5 text-xs w-full text-left group"
      >
        <Lightbulb size={13} className="text-violet-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-violet-700">
            Thinking (step {step.iteration})
          </span>
          {step.tools_called?.length > 0 && (
            <span className="text-muted-foreground">
              {" → "}calling {step.tools_called.join(", ")}
            </span>
          )}
          {!open && (
            <p className="text-muted-foreground truncate mt-0.5">{step.text}</p>
          )}
        </div>
        {open ? <ChevronDown size={12} className="text-muted-foreground mt-0.5" /> : <ChevronRight size={12} className="text-muted-foreground mt-0.5" />}
      </button>
      {open && (
        <p className="mt-1.5 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-violet-50/50 rounded p-2 border border-violet-100">
          {step.text}
        </p>
      )}
    </div>
  );
}

function ToolCallStep({ call }) {
  const [open, setOpen] = useState(false);
  const Icon = TOOL_ICONS[call.tool_name] || Wrench;

  return (
    <div className="border-l-2 border-l-amber-400 pl-3 py-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs w-full text-left"
      >
        <Icon size={13} className="text-amber-600 flex-shrink-0" />
        <span className="font-medium text-amber-700">{call.tool_name.replace(/_/g, " ")}</span>
        {call.success ? (
          <CheckCircle size={12} className="text-green-500" />
        ) : (
          <XCircle size={12} className="text-red-500" />
        )}
        {call.parameters && Object.keys(call.parameters).length > 0 && (
          <span className="text-muted-foreground font-mono">
            ({Object.entries(call.parameters).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")})
          </span>
        )}
        {open ? <ChevronDown size={12} className="text-muted-foreground ml-auto" /> : <ChevronRight size={12} className="text-muted-foreground ml-auto" />}
      </button>
      {open && call.result != null && (
        <pre className="mt-1.5 text-[11px] leading-relaxed bg-slate-50 p-2 rounded overflow-x-auto max-h-48 text-slate-600 border">
          {typeof call.result === "string"
            ? call.result
            : JSON.stringify(call.result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ReasoningTrace({ reasoning_steps, tool_calls }) {
  if (!reasoning_steps?.length && !tool_calls?.length) return null;

  const timeline = [];

  const stepsMap = {};
  reasoning_steps?.forEach((s) => {
    stepsMap[s.iteration] = s;
  });

  const callsByIteration = {};
  tool_calls?.forEach((c) => {
    const iter = c.iteration || 1;
    if (!callsByIteration[iter]) callsByIteration[iter] = [];
    callsByIteration[iter].push(c);
  });

  const allIterations = new Set([
    ...Object.keys(stepsMap).map(Number),
    ...Object.keys(callsByIteration).map(Number),
  ]);

  [...allIterations].sort((a, b) => a - b).forEach((iter) => {
    if (stepsMap[iter]) timeline.push({ type: "reasoning", data: stepsMap[iter] });
    callsByIteration[iter]?.forEach((c) => timeline.push({ type: "tool_call", data: c }));
  });

  if (timeline.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {timeline.map((item, i) =>
        item.type === "reasoning" ? (
          <ReasoningStep key={i} step={item.data} />
        ) : (
          <ToolCallStep key={i} call={item.data} />
        )
      )}
    </div>
  );
}

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const isStreaming = message.streaming === true;
  const [showTrace, setShowTrace] = useState(false);

  const hasTrace =
    (message.reasoning_steps?.length > 0) || (message.tool_calls?.length > 0);
  const stepCount =
    (message.reasoning_steps?.length || 0) + (message.tool_calls?.length || 0);
  const traceVisible = showTrace || isStreaming;

  return (
    <div className={cn("flex gap-3 py-4", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-teal-100 text-teal-700"
        )}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className={cn("flex-1 max-w-[80%] space-y-2", isUser && "flex flex-col items-end")}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            {isUser ? "You" : "GeekBrain"}
          </span>
          {message.processing_time && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Clock size={10} />
              {message.processing_time.toFixed(2)}s
            </span>
          )}
        </div>

        {!isUser && hasTrace && (
          <div className="w-full">
            <button
              onClick={() => setShowTrace(!showTrace)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Brain size={13} className="text-violet-500" />
              {isStreaming ? "Reasoning..." : traceVisible ? "Hide reasoning" : "Show reasoning"}
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full">{stepCount}</span>
              {traceVisible ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {traceVisible && (
              <div className={cn(
                "mt-2 rounded-xl p-3 border space-y-0.5",
                isStreaming ? "bg-violet-50/30 border-violet-200" : "bg-slate-50/70 border-slate-200"
              )}>
                <ReasoningTrace
                  reasoning_steps={message.reasoning_steps}
                  tool_calls={message.tool_calls}
                />
                {isStreaming && (
                  <div className="flex items-center gap-1.5 text-xs text-violet-500 pt-1">
                    <Loader size={12} className="animate-spin" />
                    Processing...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(message.content || !isStreaming) && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-card border border-border rounded-tl-sm shadow-sm",
              isStreaming && !message.content && "hidden"
            )}
          >
            {message.content || (isStreaming ? "" : "No response")}
          </div>
        )}

        {!isUser && (message.tools_used?.length > 0 || message.sources?.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(message.tools_used)]?.map((t, i) => (
              <ToolBadge key={i} name={t} />
            ))}
            {message.sources?.map((s, i) => (
              <SourceBadge key={i} name={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
