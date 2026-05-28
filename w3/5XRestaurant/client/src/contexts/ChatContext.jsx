import { createContext, useContext, useReducer, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import { getSocket } from '../utils/socket';

const ChatContext = createContext(null);

// Action types
const ACTIONS = {
    SET_AI_MESSAGES: 'SET_AI_MESSAGES',
    ADD_AI_MESSAGE: 'ADD_AI_MESSAGE',
    SET_SUPPORT_CONVERSATIONS: 'SET_SUPPORT_CONVERSATIONS',
    ADD_SUPPORT_CONVERSATION: 'ADD_SUPPORT_CONVERSATION',
    UPDATE_SUPPORT_CONVERSATION: 'UPDATE_SUPPORT_CONVERSATION',
    ADD_SUPPORT_MESSAGE: 'ADD_SUPPORT_MESSAGE',
    SET_ACTIVE_CONVERSATION: 'SET_ACTIVE_CONVERSATION',
    UPDATE_UNREAD_COUNT: 'UPDATE_UNREAD_COUNT',
    SET_LOADING: 'SET_LOADING',
    SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',
    SET_AI_COOLDOWN: 'SET_AI_COOLDOWN',
};

// Initial state
const initialState = {
    aiMessages: [],
    aiCooldown: 0,
    supportConversations: [],
    activeConversationId: null, // 'ai' or conversationId
    isLoading: false,
    connectionStatus: 'disconnected',
};

// Reducer
function chatReducer(state, action) {
    switch (action.type) {
        case ACTIONS.SET_AI_MESSAGES:
            return { ...state, aiMessages: action.payload };
        
        case ACTIONS.ADD_AI_MESSAGE:
            return { ...state, aiMessages: [...state.aiMessages, action.payload] };
        
        case ACTIONS.SET_SUPPORT_CONVERSATIONS:
            return { ...state, supportConversations: action.payload };
        
        case ACTIONS.ADD_SUPPORT_CONVERSATION:
            return {
                ...state,
                supportConversations: [action.payload, ...state.supportConversations],
            };
        
        case ACTIONS.UPDATE_SUPPORT_CONVERSATION:
            return {
                ...state,
                supportConversations: state.supportConversations.map((conv) =>
                    conv.conversationId === action.payload.conversationId
                        ? { ...conv, ...action.payload.updates }
                        : conv
                ),
            };
        
        case ACTIONS.ADD_SUPPORT_MESSAGE:
            return {
                ...state,
                supportConversations: state.supportConversations.map((conv) =>
                    conv.conversationId === action.payload.conversationId
                        ? {
                              ...conv,
                              messages: [...(conv.messages || []), action.payload.message],
                          }
                        : conv
                ),
            };
        
        case ACTIONS.SET_ACTIVE_CONVERSATION:
            return { ...state, activeConversationId: action.payload };
        
        case ACTIONS.UPDATE_UNREAD_COUNT:
            return {
                ...state,
                supportConversations: state.supportConversations.map((conv) =>
                    conv.conversationId === action.payload.conversationId
                        ? { ...conv, unreadCount: action.payload.count }
                        : conv
                ),
            };
        
        case ACTIONS.SET_LOADING:
            return { ...state, isLoading: action.payload };
        
        case ACTIONS.SET_CONNECTION_STATUS:
            return { ...state, connectionStatus: action.payload };
        
        case ACTIONS.SET_AI_COOLDOWN:
            return { ...state, aiCooldown: action.payload };
        
        default:
            return state;
    }
}

// LocalStorage keys
const AI_MESSAGES_KEY = 'tc_ai_messages';
const ACTIVE_CONVERSATION_KEY = 'tc_chat_active_conversation';

export function ChatProvider({ children }) {
    const [state, dispatch] = useReducer(chatReducer, initialState);
    const user = useSelector((s) => s.user);
    const socketRef = useRef(null);
    const cooldownIntervalRef = useRef(null);

    // Load AI messages from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(AI_MESSAGES_KEY);
            if (saved) {
                const messages = JSON.parse(saved);
                dispatch({ type: ACTIONS.SET_AI_MESSAGES, payload: messages });
            }
        } catch (e) {
            console.error('Failed to load AI messages from localStorage:', e);
        }

        // Load active conversation
        const activeConv = localStorage.getItem(ACTIVE_CONVERSATION_KEY);
        if (activeConv) {
            dispatch({ type: ACTIONS.SET_ACTIVE_CONVERSATION, payload: activeConv });
        }
    }, []);

    // Persist AI messages to localStorage
    useEffect(() => {
        if (state.aiMessages.length > 0) {
            try {
                // Keep only last 50 messages to avoid quota issues
                const messagesToSave = state.aiMessages.slice(-50);
                localStorage.setItem(AI_MESSAGES_KEY, JSON.stringify(messagesToSave));
            } catch (e) {
                console.error('Failed to save AI messages to localStorage:', e);
                // If quota exceeded, clear old messages and retry
                if (e.name === 'QuotaExceededError') {
                    const messagesToSave = state.aiMessages.slice(-20);
                    try {
                        localStorage.setItem(AI_MESSAGES_KEY, JSON.stringify(messagesToSave));
                    } catch (retryError) {
                        console.error('Failed to save even after clearing:', retryError);
                    }
                }
            }
        }
    }, [state.aiMessages]);

    // Send AI message
    const sendAIMessage = useCallback(async (text) => {
        if (!text.trim() || state.aiCooldown > 0) return;

        const userMsg = {
            id: Date.now().toString(),
            role: 'user',
            text: text.trim(),
            createdAt: new Date().toISOString(),
        };

        dispatch({ type: ACTIONS.ADD_AI_MESSAGE, payload: userMsg });
        dispatch({ type: ACTIONS.SET_LOADING, payload: true });

        try {
            // Build history (exclude initial greeting)
            const history = state.aiMessages.slice(1).map((msg) => ({
                role: msg.role,
                text: msg.text,
            }));

            const response = await Axios({
                ...SummaryApi.chat_message,
                data: { message: text.trim(), history },
            });

            if (response.data?.success) {
                const botMsg = {
                    id: Date.now().toString() + '_bot',
                    role: 'bot',
                    text: response.data.data.reply,
                    createdAt: new Date().toISOString(),
                };
                dispatch({ type: ACTIONS.ADD_AI_MESSAGE, payload: botMsg });
            }
        } catch (error) {
            const errorMsg = {
                id: Date.now().toString() + '_error',
                role: 'bot',
                text: error?.response?.data?.message || 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau ít phút! 🙏',
                createdAt: new Date().toISOString(),
            };
            dispatch({ type: ACTIONS.ADD_AI_MESSAGE, payload: errorMsg });
        } finally {
            dispatch({ type: ACTIONS.SET_LOADING, payload: false });
            // Start 5-second cooldown
            startAICooldown(5);
        }
    }, [state.aiMessages, state.aiCooldown]);

    // Start AI cooldown
    const startAICooldown = useCallback((seconds) => {
        dispatch({ type: ACTIONS.SET_AI_COOLDOWN, payload: seconds });
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = setInterval(() => {
            dispatch({ type: ACTIONS.SET_AI_COOLDOWN, payload: (prev) => {
                const next = prev - 1;
                if (next <= 0) {
                    clearInterval(cooldownIntervalRef.current);
                    return 0;
                }
                return next;
            }});
        }, 1000);
    }, []);

    // Send support message
    const sendSupportMessage = useCallback((conversationId, text) => {
        if (!text.trim() || !socketRef.current?.connected) return;

        socketRef.current.emit('customer:message', {
            conversationId,
            text: text.trim(),
            senderName: user?.name || 'Khách',
        });
    }, [user]);

    // Set active conversation
    const setActiveConversation = useCallback((id) => {
        dispatch({ type: ACTIONS.SET_ACTIVE_CONVERSATION, payload: id });
        localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
    }, []);

    // Mark conversation as read
    const markConversationAsRead = useCallback(async (conversationId) => {
        dispatch({
            type: ACTIONS.UPDATE_UNREAD_COUNT,
            payload: { conversationId, count: 0 },
        });

        try {
            await Axios({
                ...SummaryApi.mark_support_conversation_read,
                url: SummaryApi.mark_support_conversation_read.url.replace(':id', conversationId),
            });
        } catch (e) {
            console.error('Failed to mark conversation as read:', e);
        }
    }, []);

    // Connect socket
    const connectSocket = useCallback(() => {
        const socket = getSocket();
        socketRef.current = socket;

        if (!socket.connected) {
            socket.connect();
        }

        socket.on('connect', () => {
            dispatch({ type: ACTIONS.SET_CONNECTION_STATUS, payload: 'connected' });
        });

        socket.on('disconnect', () => {
            dispatch({ type: ACTIONS.SET_CONNECTION_STATUS, payload: 'disconnected' });
        });

        socket.on('message:new', (msg) => {
            dispatch({
                type: ACTIONS.ADD_SUPPORT_MESSAGE,
                payload: { conversationId: msg.conversationId, message: msg },
            });
        });

        socket.on('conversation:closed', ({ conversationId }) => {
            dispatch({
                type: ACTIONS.UPDATE_SUPPORT_CONVERSATION,
                payload: { conversationId, updates: { status: 'closed' } },
            });
        });
    }, []);

    // Disconnect socket
    const disconnectSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearInterval(cooldownIntervalRef.current);
        };
    }, []);

    const value = {
        // State
        ...state,
        
        // Methods
        sendAIMessage,
        sendSupportMessage,
        setActiveConversation,
        markConversationAsRead,
        connectSocket,
        disconnectSocket,
        
        // Dispatch for advanced usage
        dispatch,
        ACTIONS,
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within ChatProvider');
    }
    return context;
}
