import { useRef } from 'react';
import QRCode from 'react-qr-code';
import { FiX, FiDownload, FiCopy, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Tự động lấy domain hiện tại – đúng cho cả local và Vercel
const FRONTEND_URL = window.location.origin;

export default function TableQRModal({ table, close }) {
    const qrRef = useRef(null);

    // URL mà QR encode — thay domain khi deploy Vercel
    const loginUrl = table.qrCodeToken
        ? `${FRONTEND_URL}/table-login?token=${table.qrCodeToken}`
        : null;

    // Download QR as SVG → PNG via canvas
    const handleDownload = () => {
        const svg = qrRef.current?.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const size = 400;
        canvas.width = size;
        canvas.height = size;

        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const ctx = canvas.getContext('2d');
            // White background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(img, 0, 0, size, size);
            URL.revokeObjectURL(url);

            const link = document.createElement('a');
            link.download = `QR_Ban_${table.tableNumber}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success('Đã tải QR code!');
        };
        img.src = url;
    };

    const handleCopyUrl = () => {
        if (!loginUrl) return;
        navigator.clipboard.writeText(loginUrl);
        toast.success('Đã copy URL!');
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={close}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5 text-white flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">QR Code</h2>
                        <p className="text-white/80 text-sm mt-0.5">
                            Bàn {table.tableNumber} · {table.location || 'Nhà hàng'}
                        </p>
                    </div>
                    <button
                        onClick={close}
                        className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="p-6">
                    {loginUrl ? (
                        <>
                            {/* QR Code */}
                            <div
                                ref={qrRef}
                                className="flex justify-center mb-4"
                            >
                                <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-inner">
                                    <QRCode
                                        value={loginUrl}
                                        size={200}
                                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                        viewBox="0 0 256 256"
                                    />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 text-center">
                                <p className="text-xs text-orange-700 font-medium">
                                    📱 Khách quét QR này để đặt món tại bàn
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Sức chứa: {table.capacity} người · {table.status === 'available' ? '🟢 Trống' : '🔴 Đang dùng'}
                                </p>
                            </div>

                            {/* URL preview */}
                            <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center gap-2">
                                <p className="text-xs text-gray-500 flex-1 truncate font-mono">
                                    {loginUrl.substring(0, 55)}...
                                </p>
                                <button onClick={handleCopyUrl} className="text-orange-500 hover:text-orange-600 flex-shrink-0">
                                    <FiCopy size={16} />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition"
                                >
                                    <FiDownload size={16} />
                                    Tải QR
                                </button>
                                <button
                                    onClick={() => window.open(loginUrl, '_blank')}
                                    className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-500 font-semibold py-2.5 rounded-xl transition"
                                >
                                    <FiExternalLink size={16} />
                                    Mở link
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-5xl mb-3">⚠️</div>
                            <p className="font-semibold text-gray-700">Bàn chưa có QR code</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Xóa và tạo lại bàn, hoặc gọi API <code className="bg-gray-100 px-1 rounded">/api/table/regenerate-qr</code> với ID bàn này.
                            </p>
                            <p className="text-xs text-gray-400 mt-2 font-mono break-all">ID: {table._id}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
