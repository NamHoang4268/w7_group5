import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL
    || import.meta.env.VITE_API_URL
    || "http://localhost:8080";

// Singleton instance
let socket = null;

export function getSocket() {
    // Nếu socket đã bị disconnect hoàn toàn hoặc chưa tạo, tạo mới
    if (!socket || socket.disconnected && socket.io?._readyState === 'closed') {
        if (socket) {
            socket.removeAllListeners();
            socket = null;
        }
        socket = io(SOCKET_URL, {
            autoConnect: false,
            withCredentials: true,
            // polling trước để vượt qua proxy/CDN, rồi upgrade lên websocket
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });
    }
    return socket;
}

export function destroySocket() {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
}