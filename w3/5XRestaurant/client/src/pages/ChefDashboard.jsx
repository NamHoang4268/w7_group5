import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import Axios from '../utils/Axios';
import toast from 'react-hot-toast';
import { FiClock, FiCheckCircle, FiRefreshCw, FiWifi, FiWifiOff, FiMaximize, FiMinimize, FiCheck, FiX } from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';
import { BsBellFill } from 'react-icons/bs';
import { MdOutlineRestaurantMenu } from 'react-icons/md';
import { Clock, Flame, CheckCircle2 } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';

const STATUS_CONFIG = {
    pending: { 
        label: 'Chờ chế biến',
        shortLabel: 'Chờ chế biến',
        icon: Clock,
        color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700',
        badgeColor: 'bg-red-500',
        dot: 'bg-orange-500',
        next: 'cooking',
        nextLabel: 'Bắt đầu nấu',
        buttonColor: 'bg-blue-600 hover:bg-blue-500'
    },
    cooking: { 
        label: 'Đang thực hiện',
        shortLabel: 'Đang nấu',
        icon: Flame,
        color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700',
        badgeColor: 'bg-blue-500',
        dot: 'bg-blue-500',
        next: 'ready',
        nextLabel: 'Đánh dấu xong',
        buttonColor: 'bg-green-600 hover:bg-green-500'
    },
    ready: { 
        label: 'Sẵn sàng phục vụ',
        shortLabel: 'Sẵn sàng',
        icon: CheckCircle2,
        color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700',
        badgeColor: 'bg-green-500',
        dot: 'bg-green-500',
        next: null,
        nextLabel: null,
        buttonColor: ''
    },
};

// Beep sound for new order notification
function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch {
        // ignore if no audio context
    }
}

const ChefDashboard = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [clock, setClock] = useState(new Date());
    const [updatingId, setUpdatingId] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [tablesMap, setTablesMap] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedTables, setExpandedTables] = useState(new Set());
    const socketRef = useRef(null);

    useEffect(() => {
        const interval = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Manage body scroll when expanded
    useEffect(() => {
        if (isExpanded) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isExpanded]);

    const fetchTables = useCallback(async () => {
        try {
            const res = await Axios({ url: '/api/table/get-all', method: 'GET' });
            if (res.data?.success) {
                const map = {};
                res.data.data.forEach(t => {
                    map[t._id] = t.tableNumber;
                });
                setTablesMap(map);
            }
        } catch (err) {
            console.warn('Failed to fetch tables for mapping:', err);
        }
    }, []);

    const toggleExpanded = () => {
        setIsExpanded(prev => !prev);
    };

    const fetchItems = useCallback(async () => {
        try {
            const res = await Axios({ url: '/api/kitchen/active', method: 'GET' });
            if (res.data?.success) setItems(res.data.data);
        } catch {
            toast.error('Không thể tải danh sách món.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
        fetchTables();

        const s = io(SOCKET_URL);
        socketRef.current = s;

        s.on('connect', () => setConnected(true));
        s.on('disconnect', () => setConnected(false));
        s.emit('kitchen:join');

        s.on('kitchen:new_order', (data) => {
            playBeep();
            toast(`🔔 Bàn ${data.tableName} – Đơn mới vào bếp!`, {
                icon: <BsBellFill className="text-orange-500" />,
                duration: 6000,
                style: { border: '2px solid #f97316' },
            });
            fetchItems();
        });

        s.on('dish:served', () => fetchItems());

        return () => s.disconnect();
    }, [fetchItems, fetchTables]);

    const updateStatus = async (orderId, itemId, newStatus) => {
        setUpdatingId(itemId);
        try {
            await Axios({
                url: `/api/kitchen/item/${orderId}/${itemId}/status`,
                method: 'PATCH',
                data: { status: newStatus },
            });
            setItems((prev) =>
                prev.map((item) =>
                    item._id === itemId ? { ...item, kitchenStatus: newStatus } : item
                )
            );
            if (newStatus === 'ready') {
                toast.success('Món xong! Đã thông báo waiter 🛎️');
            }
        } catch {
            toast.error('Cập nhật thất bại.');
        } finally {
            setUpdatingId(null);
        }
    };

    // Group items by status (Kanban columns)
    const itemsByStatus = {
        pending: items.filter(i => i.kitchenStatus === 'pending'),
        cooking: items.filter(i => i.kitchenStatus === 'cooking'),
        ready: items.filter(i => i.kitchenStatus === 'ready'),
    };

    // Group pending items by table with smart sorting
    const pendingByTable = itemsByStatus.pending.reduce((acc, item) => {
        let tableName = 'Không rõ';
        if (item.tableId) {
            if (typeof item.tableId === 'object') {
                tableName = item.tableId.tableNumber || item.tableId.name || item.tableId.tableName || tablesMap[item.tableId._id] || item.tableId._id;
            } else {
                tableName = tablesMap[item.tableId] || item.tableId;
            }
        }
        
        if (!acc[tableName]) {
            acc[tableName] = {
                tableName,
                items: [],
                oldestTime: item.sentAt ? new Date(item.sentAt).getTime() : Date.now(),
                totalItems: 0,
            };
        }
        acc[tableName].items.push(item);
        acc[tableName].totalItems++;
        
        // Track oldest item time for this table
        if (item.sentAt) {
            const itemTime = new Date(item.sentAt).getTime();
            if (itemTime < acc[tableName].oldestTime) {
                acc[tableName].oldestTime = itemTime;
            }
        }
        
        return acc;
    }, {});

    // Smart sorting: Priority = (wait time weight) + (item count weight)
    const pendingTableGroups = Object.values(pendingByTable).sort((a, b) => {
        const waitA = Math.floor((Date.now() - a.oldestTime) / 60000);
        const waitB = Math.floor((Date.now() - b.oldestTime) / 60000);
        
        // Priority score: wait time (70%) + item count (30%)
        const scoreA = (waitA * 0.7) + (a.totalItems * 0.3);
        const scoreB = (waitB * 0.7) + (b.totalItems * 0.3);
        
        return scoreB - scoreA; // Higher score = higher priority
    });

    // Filter by search query
    const filteredPendingGroups = searchQuery.trim()
        ? pendingTableGroups.filter(group => 
            group.tableName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : pendingTableGroups;

    // Auto-expand top 3 priority tables on first load
    useEffect(() => {
        if (filteredPendingGroups.length > 0 && expandedTables.size === 0) {
            const topTables = new Set(
                filteredPendingGroups.slice(0, 3).map(g => g.tableName)
            );
            setExpandedTables(topTables);
        }
    }, [filteredPendingGroups, expandedTables.size]);

    const toggleTableExpand = (tableName) => {
        setExpandedTables(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tableName)) {
                newSet.delete(tableName);
            } else {
                newSet.add(tableName);
            }
            return newSet;
        });
    };

    const expandAll = () => {
        setExpandedTables(new Set(filteredPendingGroups.map(g => g.tableName)));
    };

    const collapseAll = () => {
        setExpandedTables(new Set());
    };

    // Sort cooking and ready items by wait time (longest wait first)
    const sortedCooking = [...itemsByStatus.cooking].sort((a, b) => {
        const timeA = a.sentAt ? new Date(a.sentAt).getTime() : Date.now();
        const timeB = b.sentAt ? new Date(b.sentAt).getTime() : Date.now();
        return timeA - timeB;
    });

    const sortedReady = [...itemsByStatus.ready].sort((a, b) => {
        const timeA = a.sentAt ? new Date(a.sentAt).getTime() : Date.now();
        const timeB = b.sentAt ? new Date(b.sentAt).getTime() : Date.now();
        return timeA - timeB;
    });

    const totalPending = itemsByStatus.pending.length;
    const totalCooking = itemsByStatus.cooking.length;
    const totalReady = itemsByStatus.ready.length;

    // Calculate average wait time for cooking items
    const avgCookingTime = itemsByStatus.cooking.length > 0
        ? Math.floor(
            itemsByStatus.cooking.reduce((sum, item) => {
                const mins = item.sentAt ? Math.floor((Date.now() - new Date(item.sentAt)) / 60000) : 0;
                return sum + mins;
            }, 0) / itemsByStatus.cooking.length
        )
        : 0;

    return (
        <div className={`h-full bg-background text-foreground transition-all duration-300 ${
            isExpanded ? 'fixed inset-0 z-[9999] overflow-y-auto w-full h-full' : 'relative'
        }`}>
            {/* Header */}
            <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10 w-full shadow-sm"
                style={{
                    background: 'rgba(var(--card-rgb, 255, 255, 255), 0.95)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <div className="w-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)',
                            }}
                        >
                            <GiCookingPot className="text-white text-xl" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-none">Chef Dashboard</h1>
                            <p className="text-muted-foreground text-xs mt-0.5">
                                {clock.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', day: '2-digit', month: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-4">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <Clock className="w-5 h-5" style={{ color: '#C96048' }} />
                                <p className="text-2xl font-bold" style={{ color: '#C96048' }}>{totalPending}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Đang chờ</p>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <Flame className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">{totalCooking}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Đang chế biến</p>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
                                <p className="text-2xl font-bold text-green-500 dark:text-green-400">{totalReady}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Sẵn sàng</p>
                        </div>
                        {avgCookingTime > 0 && (
                            <>
                                <div className="h-8 w-px bg-border" />
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <FiClock className="text-foreground" />
                                        <p className="text-2xl font-bold text-foreground">{avgCookingTime}m</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Trung bình</p>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Connection indicator */}
                        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                            connected 
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}>
                            {connected ? <FiWifi size={12} /> : <FiWifiOff size={12} />}
                            {connected ? 'Real-time' : 'Offline'}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleExpanded}
                                title={isExpanded ? "Thu nhỏ" : "Phóng to"}
                                className="flex items-center justify-center bg-card hover:bg-accent border border-border w-10 h-10 rounded-xl transition text-foreground active:scale-95"
                            >
                                {isExpanded ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
                            </button>
                            <button
                                onClick={fetchItems}
                                className="flex items-center gap-2 bg-card hover:bg-accent border border-border px-3 py-2 h-10 rounded-xl transition text-sm text-foreground active:scale-95"
                            >
                                <FiRefreshCw size={14} /> Làm mới
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content - Kanban Board */}
            <div className="w-full p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 mr-3" style={{ borderColor: '#C96048' }} />
                        Đang tải...
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                        <FiCheckCircle className="text-6xl text-green-500" />
                        <p className="text-xl font-semibold text-foreground">Không có món nào cần nấu 🎉</p>
                        <p className="text-sm">Tất cả đơn hàng đã được xử lý</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Column 1: Chờ chế biến (Pending) - Grouped by Table with Collapse */}
                        <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                    <h2 className="text-lg font-bold text-foreground">{STATUS_CONFIG.pending.label}</h2>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                                        {totalPending}
                                    </span>
                                </div>
                            </div>

                            {/* Search & Controls */}
                            {pendingTableGroups.length > 0 && (
                                <div className="mb-3 space-y-2">
                                    {/* Search */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="🔍 Tìm bàn..."
                                            className="w-full px-3 py-2 pr-8 rounded-lg text-sm border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <FiX size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Expand/Collapse All */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={expandAll}
                                            className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-card hover:bg-accent border border-border text-foreground transition active:scale-95"
                                        >
                                            Mở tất cả
                                        </button>
                                        <button
                                            onClick={collapseAll}
                                            className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-card hover:bg-accent border border-border text-foreground transition active:scale-95"
                                        >
                                            Thu gọn
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                                {filteredPendingGroups.map((tableGroup, index) => {
                                    const oldestWaitMins = Math.floor((Date.now() - tableGroup.oldestTime) / 60000);
                                    const isExpanded = expandedTables.has(tableGroup.tableName);
                                    const isPriority = index < 3; // Top 3 are priority
                                    
                                    return (
                                        <div key={tableGroup.tableName} className="space-y-2">
                                            {/* Collapsible Table Header */}
                                            <button
                                                onClick={() => toggleTableExpand(tableGroup.tableName)}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all hover:shadow-md active:scale-[0.99]"
                                                style={{
                                                    background: isPriority
                                                        ? 'linear-gradient(135deg, rgba(201, 96, 72, 0.15) 0%, rgba(217, 122, 102, 0.08) 100%)'
                                                        : 'linear-gradient(135deg, rgba(201, 96, 72, 0.08) 0%, rgba(217, 122, 102, 0.03) 100%)',
                                                    borderLeft: isPriority ? '4px solid #C96048' : '3px solid rgba(201, 96, 72, 0.5)',
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg transition-transform duration-200" style={{
                                                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                                                    }}>
                                                        ▶
                                                    </span>
                                                    <span className="text-lg">🪑</span>
                                                    <div className="text-left">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold" style={{ color: '#C96048' }}>
                                                                Bàn {tableGroup.tableName}
                                                            </span>
                                                            {isPriority && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white">
                                                                    ƯU TIÊN
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {tableGroup.totalItems} món
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {oldestWaitMins > 0 && (
                                                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                                                            oldestWaitMins > 15 
                                                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' 
                                                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                                        }`}>
                                                            <FiClock size={11} />
                                                            {oldestWaitMins}p
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                            
                                            {/* Collapsible Items */}
                                            {isExpanded && (
                                                <div className="space-y-2 pl-3 animate-in slide-in-from-top-2 duration-200">
                                                    {tableGroup.items.map((item) => (
                                                        <KitchenItemCard
                                                            key={item._id}
                                                            item={item}
                                                            status="pending"
                                                            onUpdateStatus={updateStatus}
                                                            isUpdating={updatingId === item._id}
                                                            tablesMap={tablesMap}
                                                            showTableBadge={false}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {filteredPendingGroups.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        {searchQuery ? `Không tìm thấy bàn "${searchQuery}"` : 'Không có món chờ chế biến'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Column 2: Đang thực hiện (Cooking) */}
                        <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <div className="flex items-center gap-2">
                                    <Flame className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    <h2 className="text-lg font-bold text-foreground">{STATUS_CONFIG.cooking.label}</h2>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                        {totalCooking}
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                                {sortedCooking.map((item) => (
                                    <KitchenItemCard
                                        key={item._id}
                                        item={item}
                                        status="cooking"
                                        onUpdateStatus={updateStatus}
                                        isUpdating={updatingId === item._id}
                                        tablesMap={tablesMap}
                                        showTableBadge={true}
                                    />
                                ))}
                                {totalCooking === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        Không có món đang chế biến
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Column 3: Sẵn sàng phục vụ (Ready) */}
                        <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    <h2 className="text-lg font-bold text-foreground">{STATUS_CONFIG.ready.label}</h2>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                        {totalReady}
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                                {sortedReady.map((item) => (
                                    <KitchenItemCard
                                        key={item._id}
                                        item={item}
                                        status="ready"
                                        onUpdateStatus={updateStatus}
                                        isUpdating={updatingId === item._id}
                                        tablesMap={tablesMap}
                                        showTableBadge={true}
                                    />
                                ))}
                                {totalReady === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        Không có món sẵn sàng
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(201, 96, 72, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(201, 96, 72, 0.5);
                }
            `}</style>
        </div>
    );
};

// Kitchen Item Card Component
function KitchenItemCard({ item, status, onUpdateStatus, isUpdating, tablesMap, showTableBadge = true }) {
    const cfg = STATUS_CONFIG[status];
    const waitMinutes = item.sentAt
        ? Math.floor((Date.now() - new Date(item.sentAt)) / 60000)
        : null;

    // Get table name
    let tableName = 'Không rõ';
    if (item.tableId) {
        if (typeof item.tableId === 'object') {
            tableName = item.tableId.tableNumber || item.tableId.name || item.tableId.tableName || tablesMap[item.tableId._id] || item.tableId._id;
        } else {
            tableName = tablesMap[item.tableId] || item.tableId;
        }
    }

    return (
        <div
            className="rounded-xl border overflow-hidden transition-all hover:shadow-lg active:scale-[0.99]"
            style={{
                background: 'rgba(var(--card-rgb, 255, 255, 255), 0.98)',
                backdropFilter: 'blur(12px)',
                borderColor: 'var(--border)',
            }}
        >
            {/* Card Header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                        K-{item._id?.slice(-3).toUpperCase()}
                    </span>
                    {showTableBadge && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${cfg.badgeColor}`}>
                            Bàn {tableName}
                        </span>
                    )}
                </div>
                {waitMinutes !== null && (
                    <span className={`flex items-center gap-1 text-xs font-medium ${
                        waitMinutes > 15 
                            ? 'text-red-500 dark:text-red-400' 
                            : 'text-muted-foreground'
                    }`}>
                        <FiClock size={11} />
                        {waitMinutes}p
                    </span>
                )}
            </div>

            {/* Card Body */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-base mb-1 line-clamp-2">
                            {item.product?.name || 'Món ăn'}
                        </h3>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="text-muted-foreground">
                                <MdOutlineRestaurantMenu className="inline mr-1" size={14} />
                                Main Course
                            </span>
                            <span className="font-semibold" style={{ color: '#C96048' }}>
                                x{item.quantity}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Special Instructions */}
                {item.note && (
                    <div className="mb-3 p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                        <p className="text-xs font-medium text-orange-700 dark:text-orange-400 flex items-start gap-1">
                            <span>📝</span>
                            <span className="flex-1">{item.note}</span>
                        </p>
                    </div>
                )}

                {/* Action Button */}
                {cfg.next && (
                    <button
                        onClick={() => onUpdateStatus(item.orderId, item._id, cfg.next)}
                        disabled={isUpdating}
                        className={`w-full py-2.5 rounded-lg text-sm font-bold transition disabled:opacity-50 active:scale-95 text-white flex items-center justify-center gap-2 ${cfg.buttonColor}`}
                    >
                        {isUpdating ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                Đang cập nhật...
                            </>
                        ) : (
                            <>
                                {cfg.next === 'cooking' ? <Flame size={16} /> : <FiCheck size={16} />}
                                {cfg.nextLabel}
                            </>
                        )}
                    </button>
                )}

                {/* Ready status - show "Gọi phục vụ" indicator */}
                {status === 'ready' && (
                    <div className="mt-2 text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                            <FiCheckCircle size={12} />
                            Chờ waiter phục vụ
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChefDashboard;
