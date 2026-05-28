import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { LuPencil, LuTrash } from 'react-icons/lu';
import { MdOutlineQrCode2 } from 'react-icons/md';
import Loading from '../components/Loading';
import ConfirmBox from '../components/ConfirmBox';
import successAlert from '../utils/successAlert';
import DynamicTable from '@/components/table/dynamic-table';
import {
    Card,
    CardFooter,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import GlareHover from '@/components/GlareHover';
import { Button } from '@/components/ui/button';
import UploadTableModel from '@/components/UploadTableModel';
import EditTableModel from '@/components/EditTableModel';
import NoData from '@/components/NoData';
import TableQRModal from '@/components/TableQRModal';

const TableManagementPage = () => {
    const [openAddTable, setOpenAddTable] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);

    const [openQR, setOpenQR] = useState(false);
    const [qrTable, setQrTable] = useState(null);

    const [openEdit, setOpenEdit] = useState(false);
    const [editData, setEditData] = useState({
        _id: '',
        tableNumber: '',
        capacity: 0,
        status: 'available',
        location: '',
        description: '',
    });

    const [openConfirmBoxDelete, setOpenConfirmBoxDelete] = useState(false);
    const [deleteTable, setDeleteTable] = useState({ _id: '' });

    const fetchTables = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_all_tables,
            });

            if (response.data.success) {
                const formattedData = response.data.data.map((item, index) => ({
                    id: index + 1,
                    _id: item._id,
                    tableNumber: item.tableNumber,
                    capacity: item.capacity,
                    status: item.status,
                    location: item.location || 'Chưa xác định',
                    description: item.description || '',
                    qrCodeToken: item.qrCodeToken || null,
                    date: format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm'),
                }));
                setData(formattedData);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    const handleDeleteTable = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.delete_table,
                data: deleteTable,
            });

            const { data: responseData } = response;

            if (responseData.success) {
                successAlert(responseData.message);
                fetchTables();
                setOpenConfirmBoxDelete(false);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            available: {
                text: 'Trống',
                className: 'bg-green-100 text-green-800',
            },
            occupied: {
                text: 'Đang sử dụng',
                className: 'bg-red-100 text-red-800',
            },
            reserved: {
                text: 'Đã đặt',
                className: 'bg-yellow-100 text-yellow-800',
            },
            maintenance: {
                text: 'Bảo trì',
                className: 'bg-gray-100 text-gray-800',
            },
        };

        const config = statusConfig[status] || statusConfig.available;

        return (
            <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
            >
                {config.text}
            </span>
        );
    };

    const columns = [
        { key: 'tableNumber', label: 'Số bàn', type: 'string', sortable: true },
        { key: 'id', label: 'ID', type: 'number', sortable: true },
        { key: 'capacity', label: 'Sức chứa', type: 'number', sortable: true },
        {
            key: 'status',
            label: 'Trạng thái',
            type: 'string',
            sortable: true,
            format: (value) => getStatusBadge(value),
        },
        { key: 'location', label: 'Vị trí', type: 'string', sortable: true },
        {
            key: 'date',
            label: 'Ngày tạo',
            type: 'string',
            sortable: true,
        },
        {
            key: 'action',
            label: 'Thao tác',
            type: 'string',
            sortable: false,
            format: (value, row) =>
                row ? (
                    <div className="flex gap-2">
                        {/* QR button */}
                        <button
                            className="p-2 bg-orange-100 text-orange-600 rounded-md hover:bg-orange-200"
                            title="Xem QR Code"
                            onClick={(e) => {
                                e.stopPropagation();
                                setQrTable(row);
                                setOpenQR(true);
                            }}
                        >
                            <MdOutlineQrCode2 size={18} />
                        </button>
                        <button
                            className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpenEdit(true);
                                setEditData(row);
                            }}
                        >
                            <LuPencil size={18} />
                        </button>
                        <button
                            className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpenConfirmBoxDelete(true);
                                setDeleteTable(row);
                            }}
                        >
                            <LuTrash size={18} />
                        </button>
                    </div>
                ) : null,
        },
    ];

    return (
        <section className="container mx-auto grid gap-2 z-10">
            <Card className="py-6 flex-row justify-between gap-6 border-card-foreground">
                <CardHeader>
                    <CardTitle className="text-lg text-highlight font-bold uppercase">
                        Quản lý bàn
                    </CardTitle>
                    <CardDescription>Quản lý thông tin bàn ăn</CardDescription>
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
                            onClick={() => setOpenAddTable(true)}
                            className="bg-foreground"
                        >
                            Thêm Bàn Mới
                        </Button>
                    </GlareHover>
                </CardFooter>
            </Card>

            <div className="overflow-auto w-full max-w-[95vw]">
                <DynamicTable
                    data={data}
                    columns={columns}
                    pageSize={10}
                    sortable={true}
                    searchable={true}
                    filterable={false}
                    groupable={false}
                />
            </div>
            {data.length === 0 && <NoData message="Không có bàn" />}

            {loading && <Loading />}

            {openAddTable && (
                <UploadTableModel
                    close={() => setOpenAddTable(false)}
                    fetchData={fetchTables}
                />
            )}

            {openEdit && (
                <EditTableModel
                    close={() => setOpenEdit(false)}
                    fetchData={fetchTables}
                    data={editData}
                />
            )}

            {openConfirmBoxDelete && (
                <ConfirmBox
                    close={() => setOpenConfirmBoxDelete(false)}
                    cancel={() => setOpenConfirmBoxDelete(false)}
                    confirm={handleDeleteTable}
                    title="Xóa bàn"
                    message="Bạn có chắc chắn muốn xóa bàn này?"
                    confirmText="Xóa"
                    cancelText="Hủy"
                />
            )}

            {openQR && qrTable && (
                <TableQRModal
                    table={qrTable}
                    close={() => { setOpenQR(false); setQrTable(null); }}
                />
            )}
        </section>
    );
};

export default TableManagementPage;
