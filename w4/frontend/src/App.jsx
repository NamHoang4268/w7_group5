import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BrainCircuit,
  Clock3,
  Database,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Sparkles,
  TerminalSquare,
  Wrench,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

function createSessionId() {
  if (crypto.randomUUID) {
    return `session-${crypto.randomUUID()}`;
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStoredSessionId() {
  const existing = localStorage.getItem('geekbrain-session-id');
  if (existing) return existing;
  const next = createSessionId();
  localStorage.setItem('geekbrain-session-id', next);
  return next;
}

function formatTime(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function formatDuration(milliseconds) {
  if (!milliseconds) return '0 ms';
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

function eventTitle(eventType) {
  const labels = {
    query_received: 'Query received',
    memory_loaded: 'Memory loaded',
    retrieval_completed: 'Knowledge retrieved',
    tool_executed: 'Tool executed',
    llm_invoked: 'LLM invoked',
    response_generated: 'Response generated',
  };
  return labels[eventType] || eventType.replaceAll('_', ' ');
}

function compactJson(value) {
  if (!value || Object.keys(value).length === 0) return '';
  return JSON.stringify(value, null, 2);
}

function EmptyState({ icon: Icon, title, detail }) {
  return (
    <div className="empty-state">
      <Icon size={22} />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <article className={`message ${isUser ? 'message-user' : 'message-agent'}`}>
      <div className="message-header">
        <span>{isUser ? 'You' : 'GeekBrain'}</span>
        {message.processingTime ? <span>{message.processingTime.toFixed(2)} s</span> : null}
      </div>
      <div className="message-body">{message.content}</div>
      {!isUser && (message.tools?.length || message.sources?.length) ? (
        <div className="message-meta">
          {message.tools?.map((tool) => (
            <span className="pill tool-pill" key={tool}>{tool}</span>
          ))}
          {message.sources?.map((source) => (
            <span className="pill source-pill" key={source}>{source}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function QueryRow({ query, selected, onClick }) {
  return (
    <button className={`query-row ${selected ? 'selected' : ''}`} onClick={onClick} type="button">
      <span className="query-title">{query.query || 'Untitled query'}</span>
      <span className="query-subline">
        {formatTime(query.timestamp)}
        <span>{query.num_events || 0} events</span>
        <span>{formatDuration(query.processing_time_ms)}</span>
      </span>
      <span className="query-tools">
        {(query.tools_used || []).length ? query.tools_used.map((tool) => (
          <span className="mini-pill" key={tool}>{tool}</span>
        )) : <span className="mini-pill muted">direct</span>}
      </span>
    </button>
  );
}

function EventTimeline({ events }) {
  if (!events?.length) {
    return <EmptyState icon={Activity} title="No query selected" detail="Run or select a query to inspect its events." />;
  }

  return (
    <div className="timeline">
      {events.map((event) => {
        const data = event.data || {};
        return (
          <article className="timeline-event" key={event.event_id}>
            <div className="event-marker" />
            <div className="event-content">
              <div className="event-header">
                <strong>{eventTitle(event.event_type)}</strong>
                <span>{formatTime(event.timestamp)}</span>
              </div>
              {data.tool_name ? <span className="pill tool-pill">{data.tool_name}</span> : null}
              {typeof data.success === 'boolean' ? (
                <span className={`pill ${data.success ? 'ok-pill' : 'error-pill'}`}>
                  {data.success ? 'success' : 'failed'}
                </span>
              ) : null}
              {data.num_chunks ? <span className="pill source-pill">{data.num_chunks} chunks</span> : null}
              {data.response ? <p className="event-text">{data.response}</p> : null}
              {data.result ? <p className="event-text">{data.result}</p> : null}
              {data.query ? <p className="event-text">{data.query}</p> : null}
              {data.parameters && Object.keys(data.parameters).length ? (
                <pre>{compactJson(data.parameters)}</pre>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function App() {
  const [sessionId, setSessionId] = useState(getStoredSessionId);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Unified ReAct Agent is online.',
      tools: [],
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [queries, setQueries] = useState([]);
  const [selectedQueryId, setSelectedQueryId] = useState('');
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [apiStatus, setApiStatus] = useState('checking');
  const [error, setError] = useState('');

  const latestTools = useMemo(() => {
    const seen = new Set();
    queries.forEach((query) => (query.tools_used || []).forEach((tool) => seen.add(tool)));
    return Array.from(seen).slice(0, 5);
  }, [queries]);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      setApiStatus(response.ok ? 'healthy' : 'error');
    } catch {
      setApiStatus('offline');
    }
  }, []);

  const refreshQueries = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/queries`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setQueries(data.queries || []);
      setError('');
    } catch (err) {
      setError(`Observability API error: ${err.message}`);
    }
  }, []);

  const loadQuery = useCallback(async (queryId) => {
    setSelectedQueryId(queryId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/query/${queryId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSelectedEvents(data.events || []);
      setError('');
    } catch (err) {
      setError(`Query detail error: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    refreshQueries();
    const interval = window.setInterval(() => {
      checkHealth();
      refreshQueries();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [checkHealth, refreshQueries]);

  async function submitQuery(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);
    setError('');
    setMessages((current) => [...current, { role: 'user', content: text }]);

    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, session_id: sessionId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || `HTTP ${response.status}`);
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: payload.answer,
          tools: payload.tools_used || [],
          sources: payload.sources || [],
          processingTime: payload.processing_time,
        },
      ]);
      await refreshQueries();
    } catch (err) {
      setError(err.message);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: `Request failed: ${err.message}`,
          tools: [],
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function newSession() {
    const next = createSessionId();
    localStorage.setItem('geekbrain-session-id', next);
    setSessionId(next);
    setMessages([
      {
        role: 'assistant',
        content: 'New session started.',
        tools: [],
        sources: [],
      },
    ]);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><BrainCircuit size={24} /></span>
          <div>
            <h1>GeekBrain AI Console</h1>
            <span>Unified ReAct Agent</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className={`status-dot ${apiStatus}`}>{apiStatus}</span>
          <button className="ghost-button" onClick={refreshQueries} type="button" title="Refresh events">
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="primary-button" onClick={newSession} type="button" title="Start new session">
            <MessageSquarePlus size={16} />
            New session
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="chat-panel">
          <div className="panel-heading">
            <div>
              <h2>Agent Chat</h2>
              <span>{sessionId}</span>
            </div>
            <Sparkles size={20} />
          </div>

          <div className="message-list">
            {messages.map((message, index) => (
              <MessageBubble message={message} key={`${message.role}-${index}`} />
            ))}
            {loading ? (
              <article className="message message-agent loading-message">
                <div className="message-header"><span>GeekBrain</span></div>
                <div className="typing-bar"><span /><span /><span /></div>
              </article>
            ) : null}
          </div>

          {error ? <div className="error-banner">{error}</div> : null}

          <form className="composer" onSubmit={submitQuery}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about incidents, services, costs, teams, or policies"
              rows={3}
            />
            <button className="send-button" disabled={loading || !input.trim()} type="submit" title="Send query">
              <Send size={18} />
              Send
            </button>
          </form>
        </section>

        <aside className="ops-panel">
          <div className="metrics-strip">
            <div className="metric-box">
              <Activity size={18} />
              <strong>{queries.length}</strong>
              <span>queries</span>
            </div>
            <div className="metric-box">
              <Wrench size={18} />
              <strong>{latestTools.length}</strong>
              <span>tools</span>
            </div>
            <div className="metric-box">
              <Clock3 size={18} />
              <strong>{queries[0] ? formatDuration(queries[0].processing_time_ms) : '--'}</strong>
              <span>latest</span>
            </div>
          </div>

          <div className="panel-block">
            <div className="panel-heading compact">
              <div>
                <h2>Query History</h2>
                <span>{API_BASE_URL}</span>
              </div>
              <Database size={18} />
            </div>
            <div className="query-list">
              {queries.length ? queries.map((query) => (
                <QueryRow
                  query={query}
                  selected={selectedQueryId === query.query_id}
                  onClick={() => loadQuery(query.query_id)}
                  key={query.query_id}
                />
              )) : <EmptyState icon={TerminalSquare} title="No events yet" detail="Submitted queries appear here." />}
            </div>
          </div>

          <div className="panel-block timeline-block">
            <div className="panel-heading compact">
              <div>
                <h2>Event Timeline</h2>
                <span>{selectedQueryId || 'No selection'}</span>
              </div>
              <Activity size={18} />
            </div>
            <EventTimeline events={selectedEvents} />
          </div>
        </aside>
      </main>
    </div>
  );
}
