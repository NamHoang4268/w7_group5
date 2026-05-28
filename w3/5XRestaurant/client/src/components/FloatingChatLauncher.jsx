/**
 * FloatingChatLauncher
 * ──────────────────────────────────────────────────────────────────
 * Desktop: Cột icon dọc ở góc dưới-phải với 2 nút (AI + Support)
 * Mobile: Nút tròn đơn ở góc dưới-phải, click mở menu chọn loại chat
 * ──────────────────────────────────────────────────────────────────
 */
import { useState } from 'react';
import { Bot, Headphones, MessageCircle, X } from 'lucide-react';
import AiChatBox from './AiChatBox';
import SupportChatBox from './SupportChatBox';

const CHAT_AI = 'ai';
const CHAT_SUPPORT = 'support';

export default function FloatingChatLauncher() {
    const [activeChat, setActiveChat] = useState(null);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const toggle = (type) => {
        setActiveChat((prev) => (prev === type ? null : type));
        setShowMobileMenu(false);
    };

    const handleClose = () => setActiveChat(null);

    return (
        <>
            {/* Chat Windows */}
            <AiChatBox isOpen={activeChat === CHAT_AI} onClose={handleClose} />
            <SupportChatBox
                isOpen={activeChat === CHAT_SUPPORT}
                onClose={handleClose}
            />

            {/* Desktop: Floating Pill (2 icons vertical) */}
            <div
                className="fixed bottom-6 right-5 z-50 hidden md:flex flex-col items-center gap-3"
                style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.18))' }}
            >
                {/* Support Chat Icon */}
                <div className="relative">
                    <button
                        onClick={() => toggle(CHAT_SUPPORT)}
                        title="Chat với nhân viên"
                        className="relative w-13 h-13 rounded-full flex items-center justify-center
                                   transition-all duration-250 cursor-pointer shadow-lg active:scale-95"
                        style={{
                            width: 52,
                            height: 52,
                            background:
                                'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                            boxShadow:
                                activeChat === CHAT_SUPPORT
                                    ? '0 8px 24px rgba(201,96,72,0.5), 0 0 0 2px rgba(201,96,72,0.3)'
                                    : '0 8px 20px rgba(201,96,72,0.4)',
                            transform:
                                activeChat === CHAT_SUPPORT
                                    ? 'scale(1.05)'
                                    : 'scale(1)',
                            opacity: activeChat === CHAT_SUPPORT ? 1 : 0.9,
                        }}
                        onMouseEnter={(e) => {
                            if (activeChat !== CHAT_SUPPORT) {
                                e.currentTarget.style.transform = 'scale(1.1)';
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.boxShadow =
                                    '0 8px 24px rgba(201,96,72,0.6)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeChat !== CHAT_SUPPORT) {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.opacity = '0.9';
                                e.currentTarget.style.boxShadow =
                                    '0 8px 20px rgba(201,96,72,0.4)';
                            }
                        }}
                        aria-label="Mở chat hỗ trợ nhân viên"
                        aria-pressed={activeChat === CHAT_SUPPORT}
                    >
                        <Headphones size={22} className="text-white" />
                        {activeChat === CHAT_SUPPORT && (
                            <span className="absolute inset-0 rounded-full ring-2 ring-white/30 animate-ping" />
                        )}
                    </button>
                </div>

                {/* Connector line */}
                <div
                    className="w-px h-3 rounded-full"
                    style={{
                        background:
                            'linear-gradient(to bottom, rgba(201,96,72,0.4) 0%, rgba(124,58,237,0.4) 100%)',
                    }}
                />

                {/* AI Chat Icon */}
                <div className="relative">
                    <button
                        onClick={() => toggle(CHAT_AI)}
                        title="Chat với AI"
                        className={`
                            relative w-13 h-13 rounded-full flex items-center justify-center
                            transition-all duration-250 cursor-pointer
                            shadow-lg active:scale-95
                            ${
                                activeChat === CHAT_AI
                                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600 scale-105 ring-2 ring-violet-300/60 shadow-violet-500/50'
                                    : 'bg-gradient-to-br from-violet-500 to-indigo-600 hover:scale-110 shadow-violet-500/40 hover:shadow-violet-500/60 opacity-90 hover:opacity-100'
                            }`}
                        style={{ width: 52, height: 52 }}
                        aria-label="Mở chat AI"
                        aria-pressed={activeChat === CHAT_AI}
                    >
                        <Bot size={22} className="text-white" />
                        {activeChat === CHAT_AI && (
                            <span className="absolute inset-0 rounded-full ring-2 ring-white/30 animate-ping" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile: Single FAB with popup menu */}
            <div className="md:hidden fixed bottom-5 right-5 z-50">
                {/* Popup Menu */}
                {showMobileMenu && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
                            onClick={() => setShowMobileMenu(false)}
                        />
                        
                        {/* Menu Options */}
                        <div
                            className="absolute bottom-16 right-0 flex flex-col gap-2 mb-2"
                            style={{
                                animation: 'mobile-menu-pop 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
                            }}
                        >
                            <style>{`
                                @keyframes mobile-menu-pop {
                                    from { opacity: 0; transform: scale(0.8) translateY(10px); }
                                    to { opacity: 1; transform: scale(1) translateY(0); }
                                }
                            `}</style>
                            
                            {/* Support Chat Option */}
                            <button
                                onClick={() => toggle(CHAT_SUPPORT)}
                                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white shadow-lg active:scale-95 transition-transform"
                                style={{
                                    background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                                    minWidth: '200px',
                                }}
                            >
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <Headphones size={20} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-semibold text-sm">Hỗ trợ nhân viên</p>
                                    <p className="text-xs opacity-90">Chat trực tiếp</p>
                                </div>
                            </button>

                            {/* AI Chat Option */}
                            <button
                                onClick={() => toggle(CHAT_AI)}
                                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white shadow-lg active:scale-95 transition-transform"
                                style={{
                                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                                    minWidth: '200px',
                                }}
                            >
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <Bot size={20} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-semibold text-sm">Trợ lý AI</p>
                                    <p className="text-xs opacity-90">Hỏi đáp nhanh</p>
                                </div>
                            </button>
                        </div>
                    </>
                )}

                {/* Main FAB Button */}
                <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl active:scale-95 transition-all"
                    style={{
                        background: showMobileMenu 
                            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                            : 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                        boxShadow: '0 8px 24px rgba(201,96,72,0.4)',
                    }}
                    aria-label={showMobileMenu ? 'Đóng menu' : 'Mở menu chat'}
                >
                    {showMobileMenu ? (
                        <X size={24} className="transition-transform rotate-90" />
                    ) : (
                        <MessageCircle size={24} />
                    )}
                </button>
            </div>
        </>
    );
}
