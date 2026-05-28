import { createContext, useContext, ReactNode } from 'react';

interface User {
    role: string;
    // các trường khác của user
}

interface AuthContextType {
    user: User | null;
    // các hàm xác thực khác nếu cần
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    // Thêm logic xác thực của bạn ở đây
    const user = { role: 'admin' }; // Đây là ví dụ, thay bằng logic lấy user thực tế

    return (
        <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
