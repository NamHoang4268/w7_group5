import { useState, useRef, useEffect } from 'react';
import {
    MessageCircle,
    X,
    Send,
    ChevronDown,
    Headphones,
    Wifi,
    WifiOff,
    Maximize,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useSupportChat } from '../contexts/SupportChatContext';

function ChatBubble({ msg }) {
    // Handle system messages
    if (msg.senderRole === 'system') {
        return (
            <div className="flex justify-center mb-3">
                <div className="px-3 py-1.5 rounded-full text-xs bg-muted text-muted-foreground">
                    {msg.text}
                </div>
            </div>
        );
    }

    const isUser = msg.senderRole === 'customer';
    return (
        <div
            className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end mb-3`}
        >
            {!isUser && (
                <div
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-md"
                    style={{ background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)' }}
                >
                    <Headphones size={13} className="text-white" />
                </div>
            )}
            <div
                className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isUser ? 'text-white rounded-br-sm' : 'bg-card dark:bg-gray-800 text-foreground rounded-bl-sm border border-border'
                }`}
                style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    background: isUser ? 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)' : undefined,
                }}
            >
                {msg.text}
            </div>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="flex gap-2 items-end mb-3">
            <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-md"
                style={{ background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)' }}
            >
                <Headphones size={13} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm bg-card dark:bg-gray-800 border border-border">
                <div className="flex gap-1 items-center">
                    {[0, 150, 300].map((d) => (
                        <span
                            key={d}
                            className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{
                                animationDelay: `${d}ms`,
                                background: '#C96048',
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * SupportChatBox — controlled mode
 * Props:
 *   isOpen  {boolean}  — do FloatingChatLauncher điều khiển
 *   onClose {function} — callback khi người dùng đóng
 */
export default function SupportChatBox({ isOpen = false, onClose }) {
    const { theme } = useTheme();
    const {
        messages,
        connected,
        isClosed,
        adminTyping,
        requestStatus,
        assignedWaiterName,
        customerName,
        showNameForm,
        chatDaysLeft,
        initializeConnection,
        submitGuestName,
        sendMessage,
        startNewChat,
    } = useSupportChat();

    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState('');
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [tempGuestName, setTempGuestName] = useState('');

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Khi mở lại → bỏ minimize, khởi tạo connection, focus input
    useEffect(() => {
        if (isOpen) {
            setIsMinimized(false);
            setHasNewMessage(false);
            initializeConnection();
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [isOpen, initializeConnection]);

    useEffect(() => {
        if (isOpen && !isMinimized) scrollToBottom();
    }, [messages, isOpen, isMinimized]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            setHasNewMessage(false);
            inputRef.current?.focus();
        }
    }, [isOpen, isMinimized]);

    // Monitor for new messages when chat is closed/minimized
    useEffect(() => {
        if ((!isOpen || isMinimized) && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (
                lastMessage.senderRole === 'admin' ||
                lastMessage.senderRole === 'waiter'
            ) {
                setHasNewMessage(true);
            }
        }
    }, [messages, isOpen, isMinimized]);

    const handleNameSubmit = (e) => {
        e.preventDefault();
        if (!tempGuestName.trim()) return;
        submitGuestName(tempGuestName.trim());
        setTempGuestName('');
    };

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;
        sendMessage(text);
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleNewChat = () => {
        startNewChat();
        setInput('');
    };

    const handleClose = () => {
        setIsMinimized(false);
        onClose?.();
    };

    // Không render gì khi đóng
    if (!isOpen) return null;

    return (
        <div
            className={`fixed z-50 flex flex-col transition-all duration-300 ease-out
                        bg-card dark:bg-gray-900 border border-border
                        ${isMinimized ? 'h-14' : 'h-[520px] md:h-[520px]'}
                        
                        /* Mobile: fullscreen */
                        inset-0 md:inset-auto
                        rounded-none md:rounded-2xl
                        md:bottom-6 md:right-28 md:w-[360px]`}
            style={{
                boxShadow: theme === 'dark'
                    ? '0 24px 60px rgba(0,0,0,0.6), 0 4px 16px rgba(201,96,72,0.15)'
                    : '0 24px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(201,96,72,0.08)',
                backdropFilter: 'blur(16px)',
                animation: 'chatbox-pop-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
        >
            <style>{`
                @keyframes chatbox-pop-in {
                    from { opacity: 0; transform: scale(0.88) translateY(16px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>

            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 md:py-3 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)' }}
            >
                <div className="flex items-center gap-2.5">
                    <div className="relative w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center shadow-inner">
                        <Headphones size={17} className="text-white" />
                        <span className="absolute inset-0 rounded-full ring-1 ring-white/25" />
                    </div>
                    <div>
                        <p
                            className="text-white font-semibold text-sm leading-tight"
                            style={{ fontFamily: 'Bahnschrift, system-ui, sans-serif', letterSpacing: '0.01em' }}
                        >
                            Hỗ trợ trực tiếp
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {connected ? (
                                <>
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full shadow shadow-green-400/60" />
                                    <p className="text-white/80 text-[10.5px] tracking-wide">
                                        Đang kết nối
                                    </p>
                                </>
                            ) : (
                                <>
                                    <WifiOff size={9} className="text-red-300" />
                                    <p className="text-red-200 text-[10.5px] tracking-wide">
                                        Mất kết nối
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-0.5">
                    {/* Desktop only: Maximize button */}
                    <Link
                        to={'/dashboard/chat-support-customer'}
                        className="hidden md:flex w-7 h-7 rounded-full hover:bg-white/15 items-center justify-center text-white/70 hover:text-white transition"
                        title="Mở rộng"
                    >
                        <Maximize size={14} />
                    </Link>
                    {/* Desktop only: Minimize button */}
                    <button
                        onClick={() => setIsMinimized((v) => !v)}
                        className="hidden md:flex w-7 h-7 rounded-full hover:bg-white/15 items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
                    >
                        <ChevronDown
                            size={15}
                            className={`transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`}
                        />
                    </button>
                    <button
                        onClick={handleClose}
                        className="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            {/* Minimized bar */}
            {isMinimized && (
                <button
                    onClick={() => setIsMinimized(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
                >
                    <MessageCircle size={12} />
                    Tiếp tục hỗ trợ
                    {hasNewMessage && (
                        <span className="ml-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                </button>
            )}

            {!isMinimized && (
                <>
                    {/* Name form for guests */}
                    {showNameForm ? (
                        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 bg-background dark:bg-gray-950">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                                style={{ background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)' }}
                            >
                                <Headphones size={30} className="text-white" />
                            </div>
                            <div className="text-center">
                                <p className="font-semibold text-foreground">
                                    Chat với nhân viên
                                </p>
                                <p className="text-sm mt-1 text-muted-foreground">
                                    Vui lòng cho chúng tôi biết tên bạn
                                </p>
                            </div>
                            <form
                                onSubmit={handleNameSubmit}
                                className="w-full flex flex-col gap-3"
                            >
                                <input
                                    value={tempGuestName}
                                    onChange={(e) => setTempGuestName(e.target.value)}
                                    placeholder="Nhập tên của bạn..."
                                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition bg-card dark:bg-gray-800 border border-border text-foreground"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="w-full py-2.5 rounded-xl text-white text-sm font-medium cursor-pointer hover:opacity-90 transition shadow-md"
                                    style={{
                                        background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                        boxShadow: '0 4px 12px rgba(201,96,72,0.3)',
                                    }}
                                >
                                    Bắt đầu chat
                                </button>
                            </form>
                        </div>
                    ) : (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-3 pt-4 pb-2 scroll-smooth bg-background dark:bg-gray-950">
                                {/* Waiting status banner */}
                                {requestStatus === 'waiting' && (
                                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
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
                                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                <p className="text-xs font-medium">
                                                    {assignedWaiterName} đang hỗ
                                                    trợ bạn
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                {messages.length === 0 &&
                                    requestStatus !== 'waiting' && (
                                        <div className="text-center text-sm mt-6 text-muted-foreground">
                                            <p>👋 Xin chào {customerName}!</p>
                                            <p className="mt-1">
                                                Nhân viên sẽ phản hồi sớm nhất có thể.
                                            </p>
                                        </div>
                                    )}

                                {messages.map((msg, i) => (
                                    <ChatBubble key={i} msg={msg} />
                                ))}
                                {adminTyping && <TypingIndicator />}

                                {isClosed && (
                                    <div className="text-center py-3 mt-2 flex flex-col items-center gap-2 border-t border-border">
                                        <p className="text-xs text-muted-foreground">
                                            Hội thoại đã được đóng. Cảm ơn bạn đã liên hệ!
                                        </p>
                                        {chatDaysLeft !== null && chatDaysLeft >= 0 && (
                                            <p className="text-[10px] text-muted-foreground/70 italic">
                                                {chatDaysLeft > 0
                                                    ? `📋 Lịch sử chat sẽ tự xóa sau ${chatDaysLeft} ngày`
                                                    : '📋 Lịch sử chat sẽ sớm bị xóa'}
                                            </p>
                                        )}
                                        <button
                                            onClick={handleNewChat}
                                            className="px-4 py-1.5 rounded-full text-xs font-medium text-white hover:opacity-90 active:scale-95 transition cursor-pointer shadow-md"
                                            style={{
                                                background: 'linear-gradient(135deg, #C96048, #d97a66)',
                                                boxShadow: '0 4px 12px rgba(201,96,72,0.3)',
                                            }}
                                        >
                                            ✨ Bắt đầu chat mới
                                        </button>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="px-3 pb-3 pt-2 flex-shrink-0 border-t border-border bg-card dark:bg-gray-900">
                                {isClosed ? (
                                    <button
                                        onClick={handleNewChat}
                                        className="w-full py-2 rounded-xl text-white text-sm font-medium cursor-pointer hover:opacity-90 active:scale-[0.98] transition shadow-md"
                                        style={{
                                            background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                            boxShadow: '0 4px 12px rgba(201,96,72,0.3)',
                                        }}
                                    >
                                        ✨ Bắt đầu chat mới
                                    </button>
                                ) : (
                                    <div className="flex items-end gap-2 rounded-xl px-3 py-2 bg-background dark:bg-gray-950 border border-border">
                                        <textarea
                                            ref={inputRef}
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Nhập tin nhắn..."
                                            rows={1}
                                            disabled={!connected}
                                            className="flex-1 resize-none bg-transparent text-sm placeholder-gray-400 dark:placeholder-gray-500 outline-none leading-relaxed max-h-24 overflow-y-auto text-foreground"
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={!input.trim() || !connected}
                                            className="flex-shrink-0 w-8 h-8 rounded-lg text-white flex items-center justify-center
                                                       hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed
                                                       transition active:scale-95 cursor-pointer shadow"
                                            style={{ background: 'linear-gradient(135deg, #C96048, #d97a66)' }}
                                        >
                                            <Send size={13} />
                                        </button>
                                    </div>
                                )}
                                <p className="text-center text-[10px] mt-1.5 text-muted-foreground">
                                    Phản hồi trong vòng vài phút
                                </p>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
