import React, { useState, useMemo } from 'react';
import { useEffect } from 'react';
import { format } from 'date-fns';
import UploadSubCategoryModel from '../components/UploadSubCategoryModel';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import ViewImage from '../components/ViewImage';
import { LuPencil, LuTrash } from 'react-icons/lu';
import { Search, FilterX } from 'lucide-react';
import Loading from '../components/Loading';
import ConfirmBox from '../components/ConfirmBox';
import successAlert from '../utils/successAlert';
import EditSubCategoryModel from '@/components/EditSubCategoryModel';
import DynamicTable from '@/components/table/dynamic-table';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import GlareHover from '@/components/GlareHover';
import { Button } from '@/components/ui/button';

const SubCategoryPage = () => {
    const [openAddSubCategory, setOpenAddSubCategory] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [categories, setCategories] = useState([]);
    const [imageURL, setImageURL] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const [openEdit, setOpenEdit] = useState(false);
    const [editData, setEditData] = useState({
        _id: '',
        name: '',
        image: '',
    });

    const [openConfirmBoxDelete, setOpenConfirmBoxDelete] = useState(false);
    const [deleteSubCategory, setDeleteSubCategory] = useState({
        _id: '',
    });

    const fetchCategories = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.get_category,
            });

            if (response.data.success) {
                setCategories(response.data.data);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    const fetchSubCategory = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_sub_category,
            });

            if (response.data.success) {
                const formattedData = response.data.data.map((item, index) => ({
                    id: index + 1,
                    _id: item._id,
                    name: item.name,
                    date: format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm'),
                    image: item.image || '',
                    category:
                        Array.isArray(item.category) && item.category.length > 0
                            ? item.category.map((cat) => cat.name).join(', ')
                            : 'Chưa có danh mục',
                    categoryData: item.category,
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
        fetchCategories();
        fetchSubCategory();
    }, []);

    const handleDeleteSubCategory = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.delete_sub_category,
                data: deleteSubCategory,
            });

            const { data: responseData } = response;

            if (responseData.success) {
                successAlert(responseData.message);
                fetchSubCategory();
                setOpenConfirmBoxDelete(false);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    // Filter data based on search term and selected category
    const filteredData = useMemo(() => {
        let filtered = data;

        // Filter by search term
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.trim().toLowerCase();
            filtered = filtered.filter((item) =>
                item.name.toLowerCase().includes(lowerTerm)
            );
        }

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter((item) => {
                if (!item.categoryData || !Array.isArray(item.categoryData)) {
                    return false;
                }
                return item.categoryData.some(
                    (cat) => cat._id === selectedCategory
                );
            });
        }

        return filtered;
    }, [data, searchTerm, selectedCategory]);

    const columns = [
        { key: 'id', label: 'ID', type: 'number', sortable: true },
        { key: 'name', label: 'Tên', type: 'string', sortable: true },
        {
            key: 'date',
            label: 'Ngày tạo',
            type: 'string',
            sortable: true,
        },
        {
            key: 'image',
            label: 'Hình ảnh',
            type: 'string',
            sortable: false,
            format: (value, row) => {
                if (!row) return 'Không có';
                return row.image ? (
                    <img
                        src={row.image}
                        alt={row.name || 'Image'}
                        className="w-12 h-12 object-cover rounded hover:scale-105 cursor-pointer border border-muted-foreground/50"
                        onClick={() => setImageURL(row.image)}
                    />
                ) : (
                    'Không có'
                );
            },
        },
        {
            key: 'category',
            label: 'Danh mục',
            type: 'string',
            sortable: false,
            format: (value, row) => {
                if (
                    !row ||
                    !row.categoryData ||
                    !Array.isArray(row.categoryData) ||
                    row.categoryData.length === 0
                ) {
                    return (
                        <span className="text-muted-foreground text-sm">
                            Chưa có danh mục
                        </span>
                    );
                }
                return (
                    <div className="flex flex-wrap gap-1">
                        {row.categoryData.map((cat, index) => (
                            <span
                                key={cat._id || index}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-background/50 text-foreground text-xs font-medium border border-highlight"
                            >
                                {cat.name}
                            </span>
                        ))}
                    </div>
                );
            },
        },
        {
            key: 'action',
            label: 'Thao tác',
            type: 'string',
            sortable: false,
            format: (value, row) =>
                row ? (
                    <div className="flex gap-2">
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
                                setDeleteSubCategory(row);
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
                        Loại sản phẩm
                    </CardTitle>
                    <CardDescription>
                        Quản lý thông tin loại sản phẩm
                    </CardDescription>
                </CardHeader>

                <CardFooter className="flex flex-col sm:flex-row gap-2">
                    <GlareHover
                        background="transparent"
                        glareOpacity={0.3}
                        glareAngle={-30}
                        glareSize={300}
                        transitionDuration={800}
                        playOnce={false}
                    >
                        <Button
                            onClick={() => setOpenAddSubCategory(true)}
                            className="bg-foreground w-full sm:w-auto"
                        >
                            Thêm Mới
                        </Button>
                    </GlareHover>
                </CardFooter>
            </Card>

            <div className="flex flex-col sm:flex-row gap-2">
                {/* Search Input */}
                <div className="relative flex-1 sm:max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Tìm kiếm loại sản phẩm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-background/60 placeholder:text-foreground"
                    />
                </div>

                {/* Category Filter */}
                <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                >
                    <SelectTrigger className="w-full sm:w-[200px] bg-background/60">
                        <SelectValue placeholder="Lọc theo danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả danh mục</SelectItem>
                        {categories.map((cat) => (
                            <SelectItem key={cat._id} value={cat._id}>
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Reset Filter Button */}
                <Button
                    variant="outline"
                    onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('all');
                    }}
                    className="w-full sm:w-auto"
                    title="Đặt lại bộ lọc"
                >
                    <FilterX className="h-4 w-4 mr-2" />
                    Đặt lại
                </Button>
            </div>

            <div className="overflow-auto w-full max-w-[95vw]">
                <DynamicTable
                    data={filteredData}
                    columns={columns}
                    pageSize={5}
                    sortable={false}
                    searchable={false}
                    filterable={false}
                    groupable={false}
                />
            </div>

            {loading && <Loading />}

            {openAddSubCategory && (
                <UploadSubCategoryModel
                    close={() => setOpenAddSubCategory(false)}
                    fetchData={fetchSubCategory}
                />
            )}

            {imageURL && (
                <ViewImage url={imageURL} close={() => setImageURL('')} />
            )}

            {openEdit && (
                <EditSubCategoryModel
                    close={() => setOpenEdit(false)}
                    fetchData={fetchSubCategory}
                    data={editData}
                />
            )}

            {openConfirmBoxDelete && (
                <ConfirmBox
                    close={() => setOpenConfirmBoxDelete(false)}
                    cancel={() => setOpenConfirmBoxDelete(false)}
                    confirm={handleDeleteSubCategory}
                    title="Xóa danh mục phụ"
                    message="Bạn có chắc chắn muốn xóa danh mục phụ này?"
                    confirmText="Xóa"
                    cancelText="Hủy"
                />
            )}
        </section>
    );
};

export default SubCategoryPage;
