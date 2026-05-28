'use client';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import defaultAvatar from '@/assets/defaultAvatar.png';
import { ThemeToggle } from '../theme-toggle';
import UserMenu from '../UserMenu';
import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSupportChat } from '@/contexts/SupportChatContext';

export function TopNav() {
    const user = useSelector((state: any) => state.user);
    const { unreadCount } = useSupportChat();

    // Safely get initials from fullName
    const getInitials = (name: string | null | undefined) => {
        if (!name || typeof name !== 'string') return 'U';
        const words = name.trim().split(/\s+/);
        return (
            words
                .slice(0, 2) // Take first two words max
                .map((word) => word[0] || '')
                .filter(Boolean)
                .join('')
                .toUpperCase() || 'U'
        );
    };

    return (
        <header className="sticky top-0 z-40 border-b bg-background">
            <div className="flex h-16 justify-end px-4 md:px-6 w-full">
                <div className="flex items-center gap-4">
                    {['ADMIN', 'WAITER', 'CASHIER'].includes(user?.role) && (
                        <Link
                            to="/dashboard/support-chat"
                            className="relative p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Hỗ trợ khách hàng"
                        >
                            <MessageSquare className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-background">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>
                    )}
                    <ThemeToggle />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="relative h-8 w-8 rounded-full"
                            >
                                <Avatar className="h-8 w-8">
                                    {user?.avatar ? (
                                        <AvatarImage
                                            src={user.avatar || defaultAvatar}
                                            alt={user.name || 'User'}
                                            className="object-cover"
                                        />
                                    ) : null}
                                    <AvatarFallback>
                                        {getInitials(user?.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="mr-4">
                            <UserMenu close={close} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
