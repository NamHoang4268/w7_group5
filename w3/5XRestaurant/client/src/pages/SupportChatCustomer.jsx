import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import { getSocket } from '../utils/socket';
import { useSupportChat } from '../contexts/SupportChatContext';
import { Headphones, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import Divider from '@/components/Divider';

function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    });
}
function formatDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function SupportChatCustomer() {
    const user = useSelector((s) => s.user);
    const { fetchUnreadCount } = useSupportChat();
    const [conversations, setConversations] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [unreadMap, setUnreadMap] = useState({});
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const selectedIdRef = useRef(null);

    selectedIdRef.current = selectedId;

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const fetchConversations = useCallback(async () => {
        try {
            setLoading(true);
            const res = await Axios({
                ...SummaryApi.get_support_conversations,
            });
            if (res.data?.success) {
                setConversations(res.data.data);
                const map = {};
                res.data.data.forEach((c) => {
                    map[c.conversationId] = c.unreadByAdmin;
                });
                setUnreadMap(map);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    useEffect(() => {
        const socket = getSocket();
        socketRef.current = socket;
        if (!socket.connected) socket.connect();

        socket.emit('admin:join', { adminName: user?.name || 'Admin' });

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('admin:join', { adminName: user?.name || 'Admin' });
        });
        socket.on('disconnect', () => setConnected(false));

        socket.on('admin:newConversation', (conv) => {
            setConversations((prev) => {
                const exists = prev.find(
                    (c) => c.conversationId === conv.conversationId
                );
                if (exists) return prev;
                return [
                    { ...conv, status: 'open', createdAt: new Date() },
                    ...prev,
                ];
            });
        });

        socket.on(
            'admin:messageNotification',
            ({ conversationId, lastMessage, unreadByAdmin }) => {
                setConversations((prev) =>
                    prev
                        .map((c) =>
                            c.conversationId === conversationId
                                ? {
                                      ...c,
                                      lastMessage,
                                      unreadByAdmin,
                                      lastMessageAt: new Date(),
                                  }
                                : c
                        )
                        .sort(
                            (a, b) =>
                                new Date(b.lastMessageAt) -
                                new Date(a.lastMessageAt)
                        )
                );
                if (selectedIdRef.current !== conversationId) {
                    setUnreadMap((prev) => ({
                        ...prev,
                        [conversationId]: (prev[conversationId] || 0) + 1,
                    }));
                }
            }
        );

        socket.on('message:new', (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        socket.on('conversation:closed', () => {
            setConversations((prev) =>
                prev.map((c) =>
                    c.conversationId === selectedIdRef.current
                        ? { ...c, status: 'closed' }
                        : c
                )
            );
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('admin:newConversation');
            socket.off('admin:messageNotification');
            socket.off('message:new');
            socket.off('conversation:closed');
        };
    }, [user]);

    const selectConversation = async (conv) => {
        setSelectedId(conv.conversationId);
        setUnreadMap((prev) => ({ ...prev, [conv.conversationId]: 0 }));
        socketRef.current?.emit('admin:joinConversation', {
            conversationId: conv.conversationId,
        });
        try {
            const res = await Axios({
                ...SummaryApi.get_support_conversation_by_id,
                url: SummaryApi.get_support_conversation_by_id.url.replace(
                    ':id',
                    conv.conversationId
                ),
            });
            if (res.data?.success) {
                setMessages(res.data.data.messages || []);
                await Axios({
                    ...SummaryApi.mark_support_conversation_read,
                    url: SummaryApi.mark_support_conversation_read.url.replace(
                        ':id',
                        conv.conversationId
                    ),
                });
                fetchUnreadCount();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSend = () => {
        const text = input.trim();
        if (!text || !selectedId) return;
        socketRef.current?.emit('admin:message', {
            conversationId: selectedId,
            text,
            adminName: user?.name || 'Admin',
        });
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClose = async () => {
        if (!selectedId) return;
        socketRef.current?.emit('admin:closeConversation', {
            conversationId: selectedId,
        });
        setConversations((prev) =>
            prev.map((c) =>
                c.conversationId === selectedId ? { ...c, status: 'closed' } : c
            )
        );
    };

    const selectedConv = conversations.find(
        (c) => c.conversationId === selectedId
    );
    const totalUnread = Object.values(unreadMap).reduce(
        (s, v) => s + (v || 0),
        0
    );

    return (
        <div className="flex h-[calc(100vh-120px)] rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm font-sans">
            {/* ── Sidebar trái: danh sách hội thoại ── */}
            <aside className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col">
                {/* Header sidebar */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                            Hỗ trợ trực tuyến
                            {totalUnread > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                                    {totalUnread}
                                </span>
                            )}
                        </h2>
                        <div className="flex items-center gap-2 text-gray-400">
                            {connected ? (
                                <Wifi size={14} className="text-green-500" />
                            ) : (
                                <WifiOff size={14} className="text-red-400" />
                            )}
                            <button
                                onClick={fetchConversations}
                                className="hover:text-green-500 transition-colors"
                                title="Làm mới"
                            >
                                <RefreshCw
                                    size={14}
                                    className={loading ? 'animate-spin' : ''}
                                />
                            </button>
                        </div>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
                            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-400 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                <div className="px-4 pt-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Trợ lý AI
                    </p>

                    {/* AI Chat */}
                    <div className="flex items-center gap-3 p-3 rounded-xl text-left transition-all bg-gray-50 border border-gray-200">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow">
                            <Headphones size={13} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-800 text-xs line-clamp-1">
                                    Trợ lý AI
                                </span>
                                <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                                    AWS Bedrock
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1">
                                Trợ lý AI thông minh sẵn sàng hỗ trợ bạn
                            </p>
                        </div>
                    </div>
                </div>

                <Divider />

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 && (
                        <p className="text-center text-sm text-gray-400 mt-10 px-4">
                            Chưa có hội thoại nào
                        </p>
                    )}

                    {/* Label section */}
                    {conversations.length > 0 && (
                        <div className="px-4 pt-4">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                Nhân viên hỗ trợ
                            </p>
                        </div>
                    )}

                    {conversations.map((conv) => {
                        const unread = unreadMap[conv.conversationId] || 0;
                        const isActive = selectedId === conv.conversationId;
                        const isOpen = conv.status !== 'closed';
                        return (
                            <div
                                key={conv.conversationId}
                                className="px-4 mb-1"
                            >
                                <button
                                    onClick={() => selectConversation(conv)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                                        isActive
                                            ? 'bg-green-50 border border-green-200'
                                            : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                                >
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-emerald-400 to-teal-600 shadow-sm`}
                                        >
                                            {conv.customerName
                                                ?.charAt(0)
                                                ?.toUpperCase() || 'K'}
                                        </div>
                                        <span
                                            className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${isOpen ? 'bg-green-400' : 'bg-gray-300'}`}
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span
                                                className={`text-sm font-medium truncate ${isActive ? 'text-green-700' : 'text-gray-800'}`}
                                            >
                                                {conv.customerName}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {unread > 0 && (
                                                    <span className="w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                                                        {unread}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                    {formatDate(
                                                        conv.lastMessageAt ||
                                                            conv.createdAt
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate mt-0.5">
                                            {conv.lastMessage ||
                                                'Bắt đầu hội thoại'}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* FAQ footer */}
                <div className="border-t border-gray-200 px-4 py-3">
                    <button className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-green-500 transition-colors">
                        <div className="flex items-center gap-2">
                            <svg
                                className="w-4 h-4 text-green-500"
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
            {selectedConv ? (
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Chat Header */}
                    <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                    {selectedConv.customerName
                                        ?.charAt(0)
                                        ?.toUpperCase() || 'K'}
                                </div>
                                <span
                                    className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${selectedConv.status === 'open' ? 'bg-green-400' : 'bg-gray-300'}`}
                                />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-gray-800">
                                    {selectedConv.customerName}
                                </p>
                                <p
                                    className={`text-xs font-medium ${selectedConv.status === 'open' ? 'text-green-500' : 'text-gray-400'}`}
                                >
                                    {selectedConv.status === 'open'
                                        ? 'Đang hoạt động'
                                        : '✓ Đã đóng'}
                                </p>
                            </div>
                        </div>

                        {selectedConv.status === 'open' && (
                            <button
                                onClick={handleClose}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 rounded-lg border border-gray-200 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                                <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                                Đóng ticket
                            </button>
                        )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-gray-50">
                        {messages.length === 0 && (
                            <p className="text-center text-sm text-gray-400 mt-10">
                                Chưa có tin nhắn
                            </p>
                        )}

                        {messages.map((msg, i) => {
                            const isAdmin = msg.senderRole === 'admin';
                            return (
                                <div
                                    key={i}
                                    className={`flex items-end gap-2 mb-3 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                                >
                                    {/* Avatar khách */}
                                    {!isAdmin && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {selectedConv.customerName
                                                ?.charAt(0)
                                                ?.toUpperCase() || 'K'}
                                        </div>
                                    )}

                                    <div
                                        className={`max-w-sm flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}
                                    >
                                        <div
                                            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                                isAdmin
                                                    ? 'bg-green-500 text-white rounded-br-sm'
                                                    : 'bg-white border border-gray-100 text-gray-700 rounded-bl-sm'
                                            }`}
                                            style={{
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {msg.text}
                                        </div>
                                        <span className="text-xs text-gray-400 px-1">
                                            {formatTime(msg.createdAt)}
                                        </span>
                                    </div>

                                    {/* Avatar admin */}
                                    {isAdmin && (
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold shrink-0">
                                            {user?.name
                                                ?.charAt(0)
                                                ?.toUpperCase() || 'A'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
                        {selectedConv.status === 'closed' ? (
                            <p className="text-center text-sm text-gray-400 py-2">
                                Hội thoại đã đóng
                            </p>
                        ) : (
                            <>
                                <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-green-400 focus-within:bg-white transition-all">
                                    <textarea
                                        value={input}
                                        onChange={(e) =>
                                            setInput(e.target.value)
                                        }
                                        onKeyDown={handleKeyDown}
                                        placeholder="Nhập tin nhắn trả lời..."
                                        rows={1}
                                        className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed max-h-24 overflow-y-auto placeholder:text-gray-400 text-gray-700"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim()}
                                        className="shrink-0 w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                                    >
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
                                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                            />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                                    <span className="text-green-500">✦</span>
                                    Nhấn{' '}
                                    <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] border border-gray-200">
                                        Enter
                                    </kbd>{' '}
                                    để gửi,{' '}
                                    <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] border border-gray-200">
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
                <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-50">
                    <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                        <svg
                            className="w-8 h-8 text-green-500"
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
                        <p className="text-sm font-medium text-gray-600">
                            Chọn một hội thoại để bắt đầu
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Danh sách khách hàng hiển thị bên trái
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
