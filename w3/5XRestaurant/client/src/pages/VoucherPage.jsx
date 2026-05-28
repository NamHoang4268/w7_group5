import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { IoPencil, IoTrash } from 'react-icons/io5';
import { format } from 'date-fns';
import NoData from './../components/NoData';
import Loading from './../components/Loading';
// Import jsPDF and autoTable for PDF generation
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import AddVoucher from '../components/AddVoucher';
import EditVoucher from '../components/EditVoucher';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import successAlert from '../utils/successAlert';
import ConfirmBox from '../components/ConfirmBox';
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import GlareHover from '@/components/GlareHover';
import { Button } from '@/components/ui/button';
import { FaFilePdf } from 'react-icons/fa6';
import { Input } from '@/components/ui/input';
import { FaSearch } from 'react-icons/fa';
import VoucherAnalytics from '../components/VoucherAnalytics';
import DynamicTable from '@/components/table/dynamic-table';

const VoucherPage = () => {
    // Tab state
    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'analytics'

    // State declarations
    const [openUploadVoucher, setOpenUploadVoucher] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [openEditVoucher, setOpenEditVoucher] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedVouchers, setSelectedVouchers] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [editFormData, setEditFormData] = useState({
        code: '',
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: 0,
        minOrderValue: 0,
        maxDiscount: null,
        startDate: '',
        endDate: '',
        usageLimit: null,
        isActive: true,
        applyForAllProducts: true,
        products: [],
        categories: [],
    });
    const [openConfirmBoxDelete, setOpenConfirmBoxDelete] = useState(false);
    const [openConfirmBulkDeleteBox, setOpenConfirmBulkDeleteBox] =
        useState(false);

    const [openConfirmBulkStatusUpdateBox, setOpenConfirmBulkStatusUpdateBox] =
        useState(false);
    const [pendingStatus, setPendingStatus] = useState(null);

    const [deleteVoucher, setDeleteVoucher] = useState({
        _id: '',
    });

    // Helper function to get time-based status badge
    const getTimeBadge = (startDate, endDate) => {
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (now < start) {
            return (
                <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-black/50 text-cyan-300 border border-cyan-200">
                    Sắp diễn ra
                </span>
            );
        } else if (now > end) {
            return (
                <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-black/50 text-rose-300 border border-rose-200">
                    Đã hết hạn
                </span>
            );
        } else {
            return (
                <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-black/50 text-lime-300 border border-lime-200">
                    Đang áp dụng
                </span>
            );
        }
    };

    // Handle select/deselect all
    const handleSelectAll = useCallback(
        (e) => {
            const isChecked = e.target.checked;
            setSelectAll(isChecked);
            if (isChecked) {
                setSelectedVouchers(filteredData.map((voucher) => voucher._id));
            } else {
                setSelectedVouchers([]);
            }
        },
        [filteredData]
    );

    // Handle individual row selection
    const handleSelectRow = useCallback((e, id) => {
        const isChecked = e.target.checked;
        if (isChecked) {
            setSelectedVouchers((prev) => [...prev, id]);
        } else {
            setSelectedVouchers((prev) =>
                prev.filter((voucherId) => voucherId !== id)
            );
            setSelectAll(false);
        }
    }, []);

    // Handle toggle status for a single voucher (defined early for columns)
    const handleToggleStatus = useCallback(async (voucher) => {
        try {
            const response = await Axios({
                ...SummaryApi.update_voucher,
                data: {
                    ...voucher,
                    isActive: !voucher.isActive,
                },
            });

            if (response.data.success) {
                successAlert(response.data.message);
                // fetchVoucher will be called after it's defined
                const accessToken = localStorage.getItem('accesstoken');
                if (accessToken) {
                    const res = await Axios({
                        ...SummaryApi.get_all_voucher,
                    });
                    if (res.data.success) {
                        setData(res.data.data);
                        setFilteredData(res.data.data);
                    }
                }
            }
        } catch (error) {
            AxiosToastError(error);
        }
    }, []);

    // Column configuration for DynamicTable
    const columns = useMemo(
        () => [
            {
                key: 'select',
                label: (
                    <input
                        type="checkbox"
                        className="h-4 w-4 mt-[3px] rounded border-gray-300 focus:ring-lime-300 cursor-pointer"
                        checked={selectAll}
                        onChange={handleSelectAll}
                    />
                ),
                sortable: false,
                format: (value, row) => (
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 focus:ring-secondary-200 cursor-pointer"
                        checked={selectedVouchers.includes(row.rawData._id)}
                        onChange={(e) => handleSelectRow(e, row.rawData._id)}
                    />
                ),
            },
            {
                key: 'code',
                label: 'Mã giảm giá',
                type: 'string',
                sortable: true,
                format: (value, row) => (
                    <div className="grid gap-1">
                        <p>{value}</p>
                        {getTimeBadge(
                            row.rawData.startDate,
                            row.rawData.endDate
                        )}
                    </div>
                ),
            },
            {
                key: 'name',
                label: 'Tên mã giảm giá',
                type: 'string',
                sortable: true,
            },
            {
                key: 'discountType',
                label: 'Loại giảm giá',
                type: 'string',
                sortable: true,
                format: (value) => {
                    if (value === 'percentage') return 'Percentage (%)';
                    if (value === 'fixed') return 'Fixed (VNĐ)';
                    return 'Free Shipping';
                },
            },
            {
                key: 'discountValue',
                label: 'Giá trị',
                type: 'number',
                sortable: false,
                format: (value, row) => (
                    <div>
                        {row.rawData.discountType === 'percentage'
                            ? `${value}%`
                            : row.rawData.discountType === 'fixed'
                            ? `${value.toLocaleString()}đ`
                            : 'Miễn phí vận chuyển'}
                        {row.rawData.maxDiscount &&
                            row.rawData.discountType === 'percentage' && (
                                <span className="text-xs font-semibold block">
                                    Tối đa:{' '}
                                    {row.rawData.maxDiscount.toLocaleString()}đ
                                </span>
                            )}
                    </div>
                ),
            },
            {
                key: 'minOrderValue',
                label: 'Đơn hàng tối thiểu',
                type: 'number',
                sortable: false,
                format: (value) =>
                    value ? `${value.toLocaleString()}đ` : 'Không có',
            },
            {
                key: 'startDate',
                label: 'Ngày bắt đầu',
                type: 'date',
                sortable: true,
                format: (value) =>
                    format(new Date(value), 'dd/MM/yyyy HH:mm:ss'),
            },
            {
                key: 'endDate',
                label: 'Ngày kết thúc',
                type: 'date',
                sortable: true,
                format: (value) =>
                    format(new Date(value), 'dd/MM/yyyy HH:mm:ss'),
            },
            {
                key: 'usageCount',
                label: 'Số lượng đã sử dụng',
                type: 'string',
                sortable: false,
                format: (value, row) =>
                    row.rawData.usageLimit === null
                        ? 'Không giới hạn'
                        : `${value}/${row.rawData.usageLimit}`,
            },
            {
                key: 'isActive',
                label: 'Trạng thái',
                type: 'boolean',
                sortable: true,
                format: (value) => (
                    <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            value
                                ? 'bg-white/10 text-emerald-500 border border-emerald-600 px-2 py-0.5'
                                : 'bg-white/10 text-rose-500 border border-rose-600 px-2 py-0.5'
                        }`}
                    >
                        {value ? 'Đang hoạt động' : 'Đã tắt'}
                    </span>
                ),
            },
            {
                key: 'actions',
                label: 'Thao tác',
                sortable: false,
                format: (value, row) => (
                    <div className="flex justify-end space-x-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <Input
                                type="checkbox"
                                className="sr-only peer"
                                checked={row.rawData.isActive}
                                onChange={() => handleToggleStatus(row.rawData)}
                            />
                            <div
                                className={`w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 peer-focus:ring-2 peer-focus:ring-green-200 dark:peer-focus:ring-green-800 ${
                                    row.rawData.isActive
                                        ? 'bg-emerald-300'
                                        : 'bg-rose-400'
                                }`}
                            >
                                <div
                                    className={`absolute left-1 top-1 bg-rose-100 rounded-full h-4 w-4 transition-transform duration-200 ease-in-out ${
                                        row.rawData.isActive
                                            ? 'translate-x-5'
                                            : 'translate-x-0'
                                    }`}
                                ></div>
                            </div>
                        </label>
                        <button
                            onClick={() => {
                                setEditFormData({
                                    ...row.rawData,
                                    startDate:
                                        row.rawData.startDate.split('T')[0],
                                    endDate: row.rawData.endDate.split('T')[0],
                                });
                                setOpenEditVoucher(true);
                            }}
                            className="liquid-glass text-foreground p-1 rounded-md"
                        >
                            <IoPencil size={18} />
                        </button>
                        <button
                            onClick={() => {
                                setDeleteVoucher({
                                    _id: row.rawData._id,
                                });
                                setOpenConfirmBoxDelete(true);
                            }}
                            className="liquid-glass text-rose-500 p-1 rounded-md"
                        >
                            <IoTrash size={18} />
                        </button>
                    </div>
                ),
            },
        ],
        [
            selectAll,
            selectedVouchers,
            handleSelectAll,
            handleSelectRow,
            handleToggleStatus,
        ]
    );

    // Transform data for DynamicTable
    const tableData = useMemo(() => {
        return filteredData.map((voucher, index) => ({
            id: index + 1,
            code: voucher.code,
            name: voucher.name,
            discountType: voucher.discountType,
            discountValue: voucher.discountValue,
            minOrderValue: voucher.minOrderValue,
            startDate: voucher.startDate,
            endDate: voucher.endDate,
            usageCount: voucher.usageCount,
            isActive: voucher.isActive,
            rawData: voucher,
        }));
    }, [filteredData]);

    // Handle bulk delete
    const handleBulkDelete = async () => {
        if (selectedVouchers.length === 0) return;

        try {
            const response = await Axios({
                ...SummaryApi.bulk_delete_vouchers,
                data: { voucherIds: selectedVouchers },
            });

            if (response.data.success) {
                successAlert(
                    `Đã xóa thành công ${selectedVouchers.length} mã giảm giá`
                );
                setSelectedVouchers([]);
                setSelectAll(false);
                fetchVoucher();
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setOpenConfirmBulkDeleteBox(false);
        }
    };

    // Handle bulk status update
    const handleBulkStatusUpdate = async () => {
        if (selectedVouchers.length === 0) return;

        const statusText = pendingStatus ? 'kích hoạt' : 'vô hiệu hóa';

        try {
            const response = await Axios({
                ...SummaryApi.bulk_update_vouchers_status,
                data: {
                    voucherIds: selectedVouchers,
                    isActive: pendingStatus,
                },
            });

            if (response.data.success) {
                successAlert(
                    `Đã ${statusText} thành công ${selectedVouchers.length} mã giảm giá`
                );
                setSelectedVouchers([]);
                setSelectAll(false);
                fetchVoucher();
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setOpenConfirmBulkStatusUpdateBox(false);
            setPendingStatus(null);
        }
    };

    // Check and update expired vouchers
    const checkAndUpdateExpiredVouchers = async (vouchers) => {
        try {
            const now = new Date();
            const expiredVouchers = vouchers.filter(
                (voucher) => new Date(voucher.endDate) < now && voucher.isActive
            );

            if (expiredVouchers.length === 0) {
                return vouchers;
            }

            const expiredVoucherIds = expiredVouchers.map(
                (voucher) => voucher._id
            );

            // Update the local state first for better UX
            setData((prevData) =>
                prevData.map((voucher) =>
                    expiredVoucherIds.includes(voucher._id)
                        ? { ...voucher, isActive: false }
                        : voucher
                )
            );

            // Update the backend
            await Axios({
                ...SummaryApi.bulk_update_vouchers_status,
                data: {
                    voucherIds: expiredVoucherIds,
                    isActive: false,
                },
            });

            // Return updated vouchers with isActive set to false for expired ones
            return vouchers.map((voucher) => ({
                ...voucher,
                isActive: expiredVoucherIds.includes(voucher._id)
                    ? false
                    : voucher.isActive,
            }));
        } catch (error) {
            console.error('Error updating expired vouchers:', error);
            return vouchers;
        }
    };

    // Fetch vouchers from API
    const fetchVoucher = async () => {
        const accessToken = localStorage.getItem('accesstoken');
        if (!accessToken) return;

        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_all_voucher,
            });

            const { data: responseData } = response;

            if (responseData.success) {
                const updatedVouchers = await checkAndUpdateExpiredVouchers(
                    responseData.data
                );
                setData(updatedVouchers);
                setFilteredData(updatedVouchers);
            }
        } catch (error) {
            console.error('Error fetching vouchers:', error);
        } finally {
            setLoading(false);
        }
    };

    // Check for expired vouchers when the component mounts
    useEffect(() => {
        const checkExpiredVouchers = async () => {
            if (data.length > 0) {
                const updatedVouchers = await checkAndUpdateExpiredVouchers(
                    data
                );
                setData(updatedVouchers);
                setFilteredData(updatedVouchers);
            }
        };

        checkExpiredVouchers();
    }, [data]);

    // Reset selection when data changes
    useEffect(() => {
        setSelectedVouchers([]);
        setSelectAll(false);
    }, [data]);

    // Apply filters and search
    useEffect(() => {
        try {
            let result = [...data];

            // Apply status filter
            if (statusFilter === 'active') {
                result = result.filter((voucher) => voucher.isActive === true);
            } else if (statusFilter === 'inactive') {
                result = result.filter((voucher) => voucher.isActive === false);
            } else if (statusFilter === 'applying') {
                result = result.filter(
                    (voucher) =>
                        new Date(voucher.startDate) < new Date() &&
                        new Date(voucher.endDate) > new Date()
                );
            } else if (statusFilter === 'expired') {
                result = result.filter(
                    (voucher) => new Date(voucher.endDate) < new Date()
                );
            } else if (statusFilter === 'upcoming') {
                result = result.filter(
                    (voucher) => new Date(voucher.startDate) > new Date()
                );
            } else if (statusFilter === 'percentage') {
                result = result.filter(
                    (voucher) => voucher.discountType === 'percentage'
                );
            } else if (statusFilter === 'fixed') {
                result = result.filter(
                    (voucher) => voucher.discountType === 'fixed'
                );
            } else if (statusFilter === 'free_shipping') {
                result = result.filter(
                    (voucher) => voucher.discountType === 'free_shipping'
                );
            }

            // Apply search term
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                result = result.filter(
                    (voucher) =>
                        voucher.code.toLowerCase().includes(searchLower) ||
                        voucher.name.toLowerCase().includes(searchLower) ||
                        voucher.description.toLowerCase().includes(searchLower)
                );
            }
            setFilteredData(result);
        } catch (error) {
            AxiosToastError(error);
        }
    }, [data, statusFilter, searchTerm]);

    // Handle delete voucher
    const handleDeleteVoucher = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.delete_voucher,
                data: { _id: deleteVoucher._id },
            });

            if (response.data.success) {
                successAlert('Xóa mã giảm giá thành công');
                setOpenConfirmBoxDelete(false);
                fetchVoucher();
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    // Handle export to PDF
    const handleExportPDF = () => {
        try {
            // Initialize PDF document
            const doc = new jsPDF();

            // Define table columns
            const tableColumn = [
                'Mã',
                'Tên',
                'Giảm giá',
                'Đơn tối thiểu',
                'Ngày bắt đầu',
                'Ngày kết thúc',
                'Trạng thái',
            ];

            // Prepare table data
            const tableRows = [];

            filteredData.forEach((voucher) => {
                tableRows.push([
                    voucher.code,
                    voucher.name,
                    voucher.discountType === 'percentage'
                        ? `${voucher.discountValue}%`
                        : `${voucher.discountValue.toLocaleString()}đ`,
                    voucher.minOrderValue
                        ? `${voucher.minOrderValue.toLocaleString()}đ`
                        : 'Không có',
                    format(new Date(voucher.startDate), 'dd/MM/yyyy'),
                    format(new Date(voucher.endDate), 'dd/MM/yyyy'),
                    voucher.isActive ? 'Đang hoạt động' : 'Đã tắt',
                ]);
            });

            // Add title
            const date = format(new Date(), 'dd/MM/yyyy');
            doc.setFontSize(16);
            doc.text(`Danh sách mã giảm giá - ${date}`, 14, 15);

            // Add table using autoTable
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 25,
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    overflow: 'linebreak',
                },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: 'bold',
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245],
                },
                margin: { top: 20 },
            });

            // Save the PDF
            doc.save(
                `danh-sach-ma-giam-gia-${format(new Date(), 'dd-MM-yyyy')}.pdf`
            );
        } catch (error) {
            console.error('Error generating PDF:', error);
            AxiosToastError('Đã xảy ra lỗi khi xuất file PDF');
        }
    };

    // Fetch data on component mount
    useEffect(() => {
        fetchVoucher();
    }, []);

    return (
        <section className="container mx-auto grid gap-2 z-10">
            {/* Header */}
            <Card className="py-6 flex-row justify-between gap-6 border-card-foreground">
                <CardHeader>
                    <CardTitle className="text-lg text-highlight font-bold uppercase">
                        Quản lý mã giảm giá
                    </CardTitle>
                    <CardDescription>
                        Quản lý danh sách mã giảm giá
                    </CardDescription>
                </CardHeader>

                <CardFooter>
                    <GlareHover
                        background="transparent"
                        glareOpacity={0.3}
                        glareAngle={-30}
                        glareSize={300}
                        transitionDuration={800}
                        playOnce={false}
                    >
                        <Button
                            onClick={() => setOpenUploadVoucher(true)}
                            className="bg-foreground"
                        >
                            Thêm Mới
                        </Button>
                    </GlareHover>
                </CardFooter>
            </Card>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-700">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-6 py-3 font-semibold transition-colors ${
                        activeTab === 'list'
                            ? 'text-highlight border-b-4 border-highlight'
                            : 'text-foreground hover:opacity-80'
                    }`}
                >
                    Danh sách
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-6 py-3 font-semibold transition-colors ${
                        activeTab === 'analytics'
                            ? 'text-highlight border-b-4 border-highlight'
                            : 'text-foreground hover:opacity-80'
                    }`}
                >
                    Thống kê
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'analytics' ? (
                <VoucherAnalytics />
            ) : (
                <div className="py-2 space-y-2">
                    {/* Filters */}
                    <div className="w-full sm:w-auto grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="relative w-full font-semibold">
                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value)
                                }
                                className="text-sm h-12 w-full border-foreground border bg-transparent px-3 rounded-md cursor-pointer"
                            >
                                <option
                                    className="text-foreground bg-background"
                                    value="all"
                                >
                                    Chọn trạng thái
                                </option>
                                <option
                                    className="text-foreground bg-background"
                                    value="active"
                                >
                                    Đang hoạt động
                                </option>
                                <option
                                    className="text-foreground bg-background"
                                    value="inactive"
                                >
                                    Đã tắt
                                </option>
                                <option
                                    className="text-foreground bg-background"
                                    value="applying"
                                >
                                    Đang áp dụng
                                </option>
                                <option
                                    className="text-foreground bg-background"
                                    value="expired"
                                >
                                    Đã hết hạn
                                </option>
                                <option
                                    className="text-foreground bg-background"
                                    value="upcoming"
                                >
                                    Sắp diễn ra
                                </option>
                            </select>
                        </div>
                        <div className="relative w-full font-semibold">
                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value)
                                }
                                className="text-sm h-12 w-full border-foreground border bg-transparent px-3 rounded-md cursor-pointer"
                            >
                                <option
                                    className="text-foreground bg-background"
                                    value="all"
                                >
                                    Chọn loại giảm giá
                                </option>
                                <option
                                    className="text-foreground bg-background"
                                    value="percentage"
                                >
                                    Phần trăm
                                </option>
                                <option
                                    className="text-foreground bg-background"
                                    value="fixed"
                                >
                                    Giảm giá cố định
                                </option>
                            </select>
                        </div>

                        <GlareHover
                            background="transparent"
                            glareOpacity={0.3}
                            glareAngle={-30}
                            glareSize={300}
                            transitionDuration={800}
                            playOnce={false}
                            className="h-12"
                        >
                            <Button
                                onClick={() => {
                                    setStatusFilter('all');
                                    setSearchTerm('');
                                }}
                                className="text-sm w-full h-full bg-background/80 hover:bg-transparent text-highlight"
                            >
                                Đặt lại bộ lọc
                            </Button>
                        </GlareHover>

                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 justify-center h-12 px-4 py-2 border border-transparent rounded-md shadow-sm
                            sm:text-sm text-xs font-medium text-white bg-red-600/80 hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-red-500"
                        >
                            <FaFilePdf size={15} />
                            <p>Xuất PDF</p>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="w-full md:w-80 lg:w-96 font-medium">
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="Tìm kiếm mã giảm giá..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 h-12 text-sm placeholder:text-foreground border-foreground bg-background/50"
                            />
                            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2" />
                        </div>
                    </div>

                    {/* Bulk actions */}
                    {selectedVouchers.length > 0 && (
                        <div className="flex space-x-2 font-semibold text-sm">
                            <button
                                onClick={() => {
                                    setOpenConfirmBulkStatusUpdateBox(true);
                                    setPendingStatus(true);
                                }}
                                className="flex items-center gap-1 px-3 bg-green-100 text-green-800 rounded hover:bg-green-200"
                            >
                                Kích hoạt ({selectedVouchers.length})
                            </button>
                            <button
                                onClick={() => {
                                    setOpenConfirmBulkStatusUpdateBox(true);
                                    setPendingStatus(false);
                                }}
                                className="flex items-center gap-1 px-3 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                            >
                                Vô hiệu hóa ({selectedVouchers.length})
                            </button>
                            <button
                                onClick={() =>
                                    setOpenConfirmBulkDeleteBox(true)
                                }
                                className="flex items-center gap-1 px-3 bg-red-100 text-red-800 rounded hover:bg-red-200"
                            >
                                Xóa ({selectedVouchers.length})
                            </button>
                        </div>
                    )}

                    {/* Vouchers Table */}
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loading />
                        </div>
                    ) : (
                        <div className="overflow-auto w-full max-w-[96vw]">
                            <DynamicTable
                                data={tableData}
                                columns={columns}
                                pageSize={10}
                                sortable={true}
                                searchable={false}
                                filterable={false}
                                groupable={false}
                            />
                            {tableData.length === 0 && (
                                <NoData message="Không có voucher" />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Add Voucher Modal */}
            {openUploadVoucher && (
                <AddVoucher
                    onClose={() => setOpenUploadVoucher(false)}
                    fetchVoucher={fetchVoucher}
                    onSuccess={() => {
                        setOpenUploadVoucher(false);
                        fetchVoucher();
                    }}
                />
            )}

            {/* Edit Voucher Modal */}
            {openEditVoucher && (
                <EditVoucher
                    voucher={editFormData}
                    fetchVoucher={fetchVoucher}
                    onClose={() => setOpenEditVoucher(false)}
                    onSuccess={() => {
                        setOpenEditVoucher(false);
                        fetchVoucher();
                    }}
                />
            )}

            {/* Delete Confirmation */}
            {openConfirmBoxDelete && (
                <ConfirmBox
                    open={openConfirmBoxDelete}
                    close={() => setOpenConfirmBoxDelete(false)}
                    confirm={handleDeleteVoucher}
                    cancel={() => setOpenConfirmBoxDelete(false)}
                    title="Xác nhận xóa"
                    message="Bạn có chắc chắn muốn xóa mã giảm giá này?"
                    confirmText="Xóa"
                    cancelText="Hủy"
                />
            )}

            {/* Bulk Delete Confirmation */}
            {openConfirmBulkDeleteBox && (
                <ConfirmBox
                    open={openConfirmBulkDeleteBox}
                    close={() => setOpenConfirmBulkDeleteBox(false)}
                    confirm={handleBulkDelete}
                    cancel={() => setOpenConfirmBulkDeleteBox(false)}
                    title="Xác nhận xóa"
                    message={`Bạn có chắc chắn muốn xóa ${selectedVouchers.length} mã giảm giá đã chọn?`}
                    confirmText="Xóa"
                    cancelText="Hủy"
                />
            )}

            {/* Bulk Status Update Confirmation */}
            {openConfirmBulkStatusUpdateBox && (
                <ConfirmBox
                    open={openConfirmBulkStatusUpdateBox}
                    close={() => setOpenConfirmBulkStatusUpdateBox(false)}
                    confirm={handleBulkStatusUpdate}
                    cancel={() => setOpenConfirmBulkStatusUpdateBox(false)}
                    title="Xác nhận thay đổi trạng thái"
                    message={`Bạn có chắc chắn muốn ${
                        pendingStatus ? 'kích hoạt' : 'vô hiệu hóa'
                    } ${selectedVouchers.length} mã giảm giá đã chọn?`}
                    confirmText="Thay đổi"
                    cancelText="Hủy"
                />
            )}
        </section>
    );
};

export default VoucherPage;
