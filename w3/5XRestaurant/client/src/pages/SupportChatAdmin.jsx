import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import { getSocket } from '../utils/socket';
import { useSupportChat } from '../contexts/SupportChatContext';
import {
    MessageSquare,
    Send,
    X,
    User,
    Clock,
    CheckCircle,
    ChevronLeft,
    Wifi,
    WifiOff,
    RefreshCw,
} from 'lucide-react';

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

export default function SupportChatAdmin() {
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

    // Fetch conversation list
    const fetchConversations = useCallback(async () => {
        try {
            setLoading(true);
            const res = await Axios({
                ...SummaryApi.get_support_conversations,
            });
            if (res.data?.success) {
                setConversations(res.data.data);
                // Init unread map
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

    // Socket setup
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

        // New conversation or message notification from any customer
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
                // If not viewing this conversation, add unread badge
                if (selectedIdRef.current !== conversationId) {
                    setUnreadMap((prev) => ({
                        ...prev,
                        [conversationId]: (prev[conversationId] || 0) + 1,
                    }));
                }
            }
        );

        // Messages from the currently open conversation
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

    // Select a conversation
    const selectConversation = async (conv) => {
        setSelectedId(conv.conversationId);
        setUnreadMap((prev) => ({ ...prev, [conv.conversationId]: 0 }));

        // Admin joins this conversation's socket room
        socketRef.current?.emit('admin:joinConversation', {
            conversationId: conv.conversationId,
        });

        // Fetch full messages
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
                // Mark as read
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
        <div className="flex h-[calc(100vh-120px)] rounded-xl overflow-hidden border border-border bg-background shadow-sm">
            {/* LEFT: Conversation list */}
            <div className="w-72 flex-shrink-0 border-r border-border flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <MessageSquare
                            size={16}
                            className="text-muted-foreground"
                        />
                        <span className="font-semibold text-sm">Hội thoại</span>
                        {totalUnread > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                                {totalUnread}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {connected ? (
                            <Wifi size={13} className="text-green-500" />
                        ) : (
                            <WifiOff size={13} className="text-red-400" />
                        )}
                        <button
                            onClick={fetchConversations}
                            className="cursor-pointer hover:text-primary transition"
                            title="Làm mới"
                        >
                            <RefreshCw
                                size={13}
                                className={loading ? 'animate-spin' : ''}
                            />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground mt-10 px-4">
                            Chưa có hội thoại nào
                        </div>
                    )}
                    {conversations.map((conv) => (
                        <button
                            key={conv.conversationId}
                            onClick={() => selectConversation(conv)}
                            className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition cursor-pointer
                                ${selectedId === conv.conversationId ? 'bg-muted' : ''}`}
                        >
                            <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0">
                                        <User
                                            size={11}
                                            className="text-white"
                                        />
                                    </div>
                                    <span className="text-sm font-medium truncate max-w-[120px]">
                                        {conv.customerName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {(unreadMap[conv.conversationId] || 0) >
                                        0 && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                                            {unreadMap[conv.conversationId]}
                                        </span>
                                    )}
                                    {conv.status === 'closed' ? (
                                        <CheckCircle
                                            size={12}
                                            className="text-muted-foreground"
                                        />
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-green-400" />
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground truncate pl-7">
                                {conv.lastMessage || 'Bắt đầu hội thoại'}
                            </p>
                            <p className="text-[10px] text-muted-foreground pl-7 mt-0.5 flex items-center gap-1">
                                <Clock size={9} />
                                {formatDate(
                                    conv.lastMessageAt || conv.createdAt
                                )}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* RIGHT: Chat panel */}
            {selectedConv ? (
                <div className="flex-1 flex flex-col">
                    {/* Chat header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow">
                                <User size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">
                                    {selectedConv.customerName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {selectedConv.status === 'open'
                                        ? '● Đang mở'
                                        : '✓ Đã đóng'}
                                </p>
                            </div>
                        </div>
                        {selectedConv.status === 'open' && (
                            <button
                                onClick={handleClose}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition cursor-pointer"
                            >
                                <X size={12} /> Đóng ticket
                            </button>
                        )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
                        {messages.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground mt-10">
                                Chưa có tin nhắn
                            </p>
                        )}
                        {messages.map((msg, i) => {
                            const isAdmin = msg.senderRole === 'admin';
                            return (
                                <div
                                    key={i}
                                    className={`flex gap-2 ${isAdmin ? 'flex-row-reverse' : 'flex-row'} items-end mb-3`}
                                >
                                    <div
                                        className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                            isAdmin
                                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm'
                                                : 'bg-muted text-foreground rounded-bl-sm'
                                        }`}
                                        style={{
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        <p>{msg.text}</p>
                                        <p
                                            className={`text-[10px] mt-0.5 ${isAdmin ? 'text-white/70 text-right' : 'text-muted-foreground'}`}
                                        >
                                            {formatTime(msg.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-5 pb-4 pt-2 border-t border-border">
                        {selectedConv.status === 'closed' ? (
                            <p className="text-center text-sm text-muted-foreground py-2">
                                Hội thoại đã đóng
                            </p>
                        ) : (
                            <div className="flex items-end gap-3 bg-muted/50 rounded-xl px-4 py-2.5 border border-border">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nhập tin nhắn trả lời..."
                                    rows={1}
                                    className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed max-h-24 overflow-y-auto placeholder:text-muted-foreground"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <MessageSquare size={48} className="opacity-20" />
                    <p className="text-sm">Chọn một hội thoại để bắt đầu</p>
                </div>
            )}
        </div>
    );
}
