import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import {
    Bot,
    Headphones,
    RefreshCw,
    Wifi,
    WifiOff,
    Send,
    Sparkles,
} from 'lucide-react';
import Divider from '@/components/Divider';
import { useSupportChat } from '../contexts/SupportChatContext';

// Quick suggestions for AI chat
const QUICK_SUGGESTIONS = [
    'Món đặc biệt của nhà hàng?',
    'Có món nào cay không?',
    'Món chay có gì?',
    'Món nào nhanh nhất?',
];

function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function TypingIndicator({ type = 'support' }) {
    const isAI = type === 'ai';
    return (
        <div className="flex gap-2 items-end mb-3">
            <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow"
                style={{
                    background: isAI
                        ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
                        : 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                }}
            >
                {isAI ? (
                    <Bot size={13} className="text-white" />
                ) : (
                    <Headphones size={13} className="text-white" />
                )}
            </div>
            <div className="bg-card dark:bg-gray-800 border border-border px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                <div className="flex gap-1 items-center">
                    {[0, 150, 300].map((d) => (
                        <span
                            key={d}
                            className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{
                                animationDelay: `${d}ms`,
                                background: isAI ? '#7c3aed' : '#C96048',
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function UnifiedChatPage() {
    const user = useSelector((s) => s.user);
    const [searchParams] = useSearchParams();

    // Support chat state from context
    const {
        messages: supportMessages,
        connected,
        isClosed: supportClosed,
        requestStatus,
        assignedWaiterName,
        sendMessage: sendSupportMessage,
        startNewChat: handleNewChat,
        initializeConnection,
        chatDaysLeft,
        // AI chat state from same context (single source of truth)
        aiMessages,
        aiLoading,
        aiCooldown,
        sendAIMessage,
    } = useSupportChat();

    // UI state
    const [selectedId, setSelectedId] = useState(null);
    const [input, setInput] = useState('');

    const messagesEndRef = useRef(null);
    const selectedIdRef = useRef(null);

    selectedIdRef.current = selectedId;

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    // Scroll khi có tin nhắn mới (smooth)
    useEffect(() => {
        scrollToBottom('smooth');
    }, [supportMessages, aiMessages, scrollToBottom]);

    // Scroll ngay lập tức khi chuyển tab để tránh nhảy lên đầu
    useEffect(() => {
        scrollToBottom('instant');
    }, [selectedId, scrollToBottom]);

    // Initialize support chat connection when component mounts
    useEffect(() => {
        initializeConnection();
    }, [initializeConnection]);

    // Set initial conversation from URL
    useEffect(() => {
        const convParam = searchParams.get('conversation');
        setSelectedId(convParam === 'support' ? 'support' : 'ai');
    }, [searchParams]);

    // Select conversation
    const selectConversation = (id) => setSelectedId(id);

    // Send message handler (delegates to context)
    const handleSendAI = (messageText) => {
        const text = (messageText || input).trim();
        if (!text) return;
        sendAIMessage(text);
        setInput('');
    };

    const sendSupportMessageHandler = () => {
        const text = input.trim();
        if (!text) return;
        sendSupportMessage(text);
        setInput('');
    };

    const handleSend = () => {
        if (selectedId === 'ai') handleSendAI();
        else sendSupportMessageHandler();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const isAIActive = selectedId === 'ai';
    const isSupportActive = selectedId === 'support';

    return (
        <div className="flex h-[calc(100vh-120px)] rounded-xl overflow-hidden border border-border bg-card dark:bg-gray-900 shadow-sm font-sans">
            {/* ── Sidebar trái: danh sách hội thoại ── */}
            <aside className="w-72 shrink-0 bg-card dark:bg-gray-900 border-r border-border flex flex-col">
                {/* Header sidebar */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                            Hỗ trợ trực tuyến
                        </h2>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            {connected ? (
                                <Wifi size={14} className="text-green-500" />
                            ) : (
                                <WifiOff size={14} className="text-red-400" />
                            )}
                        </div>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <input
                            type="text"
                            placeholder="Tìm kiếm cuộc hội thoại..."
                            className="w-full pl-9 pr-3 py-2 text-sm bg-background dark:bg-gray-950 border border-border rounded-lg outline-none focus:border-violet-400 transition-all text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                <div className="px-4 pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Trợ lý AI
                    </p>

                    {/* AI Chat Item */}
                    <button
                        onClick={() => selectConversation('ai')}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                            isAIActive
                                ? 'bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800'
                                : 'bg-muted dark:bg-gray-800 border border-border hover:bg-muted/80'
                        }`}
                    >
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow">
                            <Bot size={13} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`font-semibold text-xs line-clamp-1 ${
                                        isAIActive
                                            ? 'text-violet-700 dark:text-violet-400'
                                            : 'text-foreground'
                                    }`}
                                >
                                    Trợ lý AI
                                </span>
                                <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                                    AWS Bedrock
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                                Trợ lý AI thông minh sẵn sàng hỗ trợ bạn
                            </p>
                        </div>
                    </button>
                </div>

                <Divider />

                {/* Support Chat Item */}
                <div className="px-4 pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Nhân viên hỗ trợ
                    </p>

                    <button
                        onClick={() => selectConversation('support')}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                            isSupportActive
                                ? 'border border-[#C96048]/30 dark:border-[#C96048]/50'
                                : 'bg-muted dark:bg-gray-800 border border-border hover:bg-muted/80'
                        }`}
                        style={{
                            background: isSupportActive
                                ? 'linear-gradient(135deg, rgba(201,96,72,0.08) 0%, rgba(217,122,102,0.08) 100%)'
                                : undefined,
                        }}
                    >
                        <div
                            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow"
                            style={{
                                background:
                                    'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                            }}
                        >
                            <Headphones size={13} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`font-semibold text-xs line-clamp-1 ${
                                        isSupportActive
                                            ? 'text-[#C96048] dark:text-[#d97a66]'
                                            : 'text-foreground'
                                    }`}
                                >
                                    Chat với nhân viên
                                </span>
                                {supportClosed && (
                                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                                        Đã đóng
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                                {supportMessages.length > 0
                                    ? supportMessages[
                                          supportMessages.length - 1
                                      ].text
                                    : 'Bắt đầu hội thoại với nhân viên'}
                            </p>
                        </div>
                    </button>
                </div>

                <div className="flex-1" />

                {/* FAQ footer */}
                <div className="border-t border-border px-4 py-3">
                    <button className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-[#C96048] transition-colors">
                        <div className="flex items-center gap-2">
                            <svg
                                className="w-4 h-4 text-[#C96048]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span className="font-medium">
                                Câu hỏi thường gặp
                            </span>
                        </div>
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </button>
                </div>
            </aside>

            {/* ── Khu vực Chat ── */}
            {isAIActive ? (
                /* AI Chat Area */
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* AI Chat Header */}
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                <Bot size={20} className="text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-white">
                                    Trợ lý AI
                                </p>
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                                    <p className="text-violet-200 text-xs">
                                        EatEase Restaurant
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Messages */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-background dark:bg-gray-950">
                        {aiMessages.map((msg, i) => {
                            const isUser = msg.role === 'user';
                            return (
                                <div
                                    key={i}
                                    className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                                >
                                    {!isUser && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow">
                                            <Bot
                                                size={14}
                                                className="text-white"
                                            />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-sm flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
                                    >
                                        <div
                                            className={`px-2 py-3 my-1 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                                isUser
                                                    ? 'text-white rounded-br-sm'
                                                    : 'bg-card dark:bg-gray-800 border border-border text-foreground rounded-bl-sm'
                                            }`}
                                            style={{
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                background: isUser
                                                    ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
                                                    : undefined,
                                            }}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {aiLoading && <TypingIndicator type="ai" />}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick suggestions */}
                    {aiMessages.length === 1 && !aiLoading && (
                        <div className="px-5 pb-2 flex flex-wrap gap-1.5">
                            {QUICK_SUGGESTIONS.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleSendAI(s)}
                                    className="text-[11px] px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-950/50 transition cursor-pointer"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* AI Input */}
                    <div className="bg-card dark:bg-gray-900 border-t border-border px-4 py-3 shrink-0">
                        <div className="flex items-end gap-3 bg-background dark:bg-gray-950 border border-border rounded-xl px-3 py-2 focus-within:border-violet-400 transition-all">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Nhập câu hỏi của bạn..."
                                rows={1}
                                disabled={aiLoading}
                                className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed max-h-24 overflow-y-auto placeholder:text-muted-foreground text-foreground"
                            />
                            <button
                                onClick={handleSend}
                                disabled={
                                    !input.trim() || aiLoading || aiCooldown > 0
                                }
                                className="shrink-0 w-8 h-8 rounded-lg text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm text-[11px] font-bold"
                                style={{
                                    background:
                                        'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                                }}
                            >
                                {aiCooldown > 0 ? (
                                    aiCooldown
                                ) : (
                                    <Send size={14} />
                                )}
                            </button>
                        </div>
                        <p className="text-center text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                            <Sparkles size={12} className="text-amber-500" />
                            Powered by Amazon Bedrock
                        </p>
                    </div>
                </main>
            ) : isSupportActive ? (
                /* Support Chat Area */
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Support Chat Header */}
                    <div
                        className="px-5 py-3 flex items-center justify-between shrink-0"
                        style={{
                            background:
                                'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                <Headphones size={20} className="text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-white">
                                    Chat với nhân viên
                                </p>
                                <div className="flex items-center gap-1">
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${supportClosed ? 'bg-gray-300' : 'bg-green-400'}`}
                                    />
                                    <p className="text-white/80 text-xs">
                                        {supportClosed
                                            ? 'Đã đóng'
                                            : 'Đang hoạt động'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Support Messages */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-background dark:bg-gray-950">
                        {/* Waiting status banner */}
                        {requestStatus === 'waiting' && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                <div className="flex items-center gap-2 text-amber-700">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                    <p className="text-xs font-medium">
                                        Đang chờ nhân viên phục vụ...
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Assigned status banner */}
                        {(requestStatus === 'assigned' ||
                            requestStatus === 'active') &&
                            assignedWaiterName && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        <p className="text-xs font-medium">
                                            {assignedWaiterName} đang hỗ trợ bạn
                                        </p>
                                    </div>
                                </div>
                            )}

                        {supportMessages.length === 0 &&
                            requestStatus !== 'waiting' && (
                                <div className="text-center mt-10">
                                    <div
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                                        style={{
                                            background:
                                                'linear-gradient(135deg, rgba(201,96,72,0.1) 0%, rgba(217,122,102,0.1) 100%)',
                                        }}
                                    >
                                        <Headphones className="w-8 h-8 text-[#C96048]" />
                                    </div>
                                    <p className="text-sm text-foreground font-medium">
                                        Bắt đầu hội thoại
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Gửi tin nhắn để nhận hỗ trợ từ nhân viên
                                    </p>
                                </div>
                            )}

                        {supportMessages.map((msg, i) => {
                            // Handle system messages
                            if (msg.senderRole === 'system') {
                                return (
                                    <div
                                        key={i}
                                        className="flex justify-center mb-3"
                                    >
                                        <div className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            }

                            const isAdmin =
                                msg.senderRole === 'admin' ||
                                msg.senderRole === 'waiter';
                            const isCustomer = !isAdmin;
                            return (
                                <div
                                    key={i}
                                    className={`flex items-end gap-2 mb-3 ${isAdmin ? 'justify-start' : 'justify-end'}`}
                                >
                                    {isAdmin && (
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center shadow"
                                            style={{
                                                background:
                                                    'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                            }}
                                        >
                                            <Headphones
                                                size={14}
                                                className="text-white"
                                            />
                                        </div>
                                    )}

                                    <div
                                        className={`max-w-sm flex flex-col gap-1 ${isAdmin ? 'items-start' : 'items-end'}`}
                                    >
                                        <div
                                            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                                isAdmin
                                                    ? 'bg-card dark:bg-gray-800 border border-border text-foreground rounded-bl-sm'
                                                    : 'text-white rounded-br-sm'
                                            }`}
                                            style={{
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                background: isAdmin
                                                    ? undefined
                                                    : 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                            }}
                                        >
                                            {msg.text}
                                        </div>
                                        <span className="text-xs text-muted-foreground px-1">
                                            {formatTime(msg.createdAt)}
                                        </span>
                                    </div>

                                    {isCustomer && (
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                            style={{
                                                background:
                                                    'linear-gradient(135deg, rgba(201,96,72,0.15) 0%, rgba(217,122,102,0.15) 100%)',
                                                color: '#C96048',
                                            }}
                                        >
                                            {user?.name
                                                ?.charAt(0)
                                                ?.toUpperCase() || 'K'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Support Input */}
                    <div className="bg-card dark:bg-gray-900 border-t border-border px-4 py-3 shrink-0">
                        {supportClosed ? (
                            <div className="text-center py-3">
                                <p className="text-sm text-muted-foreground mb-1">
                                    Hội thoại đã đóng
                                </p>
                                {chatDaysLeft !== null && chatDaysLeft >= 0 && (
                                    <p className="text-[11px] text-muted-foreground/60 italic mb-3">
                                        {chatDaysLeft > 0
                                            ? `📋 Lịch sử chat sẽ tự xóa sau ${chatDaysLeft} ngày`
                                            : '📋 Lịch sử chat sẽ sớm bị xóa'}
                                    </p>
                                )}
                                {!chatDaysLeft && <div className="mb-3" />}
                                <button
                                    onClick={handleNewChat}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all shadow-sm"
                                    style={{
                                        background:
                                            'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                    }}
                                >
                                    <RefreshCw size={14} />
                                    Bắt đầu hội thoại mới
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-end gap-3 bg-background dark:bg-gray-950 border border-border rounded-xl px-3 py-2 focus-within:border-[#C96048] transition-all">
                                    <textarea
                                        value={input}
                                        onChange={(e) =>
                                            setInput(e.target.value)
                                        }
                                        onKeyDown={handleKeyDown}
                                        placeholder="Nhập tin nhắn của bạn..."
                                        rows={1}
                                        disabled={!connected}
                                        className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed max-h-24 overflow-y-auto placeholder:text-muted-foreground text-foreground"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || !connected}
                                        className="shrink-0 w-8 h-8 rounded-lg text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                                        style={{
                                            background:
                                                'linear-gradient(135deg, #C96048, #d97a66)',
                                        }}
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                                <p className="text-center text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                                    <span className="text-[#C96048]">✦</span>
                                    Nhấn{' '}
                                    <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] border border-border">
                                        Enter
                                    </kbd>{' '}
                                    để gửi,{' '}
                                    <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] border border-border">
                                        Shift+Enter
                                    </kbd>{' '}
                                    để xuống dòng.
                                </p>
                            </>
                        )}
                    </div>
                </main>
            ) : (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-background dark:bg-gray-950">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(201,96,72,0.1) 0%, rgba(217,122,102,0.1) 100%)',
                        }}
                    >
                        <svg
                            className="w-8 h-8 text-[#C96048]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                            Chọn một hội thoại để bắt đầu
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Danh sách khách hàng hiển thị bên trái
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
