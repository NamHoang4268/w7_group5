import React, { useState, useEffect, useMemo } from 'react';
import UploadCategoryModel from '../components/UploadCategoryModel';
import SummaryApi from '../common/SummaryApi';
import Loading from './../components/Loading';
import NoData from '../components/NoData';
import Axios from '../utils/Axios';
import EditCategory from '../components/EditCategoryModel';
import ConfirmBox from '../components/ConfirmBox';
import AxiosToastError from '../utils/AxiosToastError';
import successAlert from '../utils/successAlert';
import ViewImage from '../components/ViewImage';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import GlareHover from '@/components/GlareHover';
import { Button } from '@/components/ui/button';
import { Search, RotateCcw, Trash2 } from 'lucide-react';

const CategoryPage = () => {
    const [openUploadCaregory, setOpenUploadCaregory] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [deletedData, setDeletedData] = useState([]);
    const [activeTab, setActiveTab] = useState('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [openEdit, setOpenEdit] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        image: '',
    });

    const [openConfirmBoxDelete, setOpenConfirmBoxDelete] = useState(false);
    const [openConfirmBoxHardDelete, setOpenConfirmBoxHardDelete] =
        useState(false);
    const [deleteCategory, setDeleteCategory] = useState({
        _id: '',
    });
    const [imageURL, setImageURL] = useState('');

    const fetchCategory = async () => {
        const accessToken = localStorage.getItem('accesstoken');
        if (!accessToken) return;

        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_category,
            });

            const { data: responseData } = response;

            if (responseData.success) {
                setData(responseData.data);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeletedCategories = async () => {
        const accessToken = localStorage.getItem('accesstoken');
        if (!accessToken) return;

        try {
            const response = await Axios({
                ...SummaryApi.get_deleted_categories,
            });

            const { data: responseData } = response;

            if (responseData.success) {
                setDeletedData(responseData.data);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    useEffect(() => {
        fetchCategory();
        fetchDeletedCategories();
    }, []);

    const handleSoftDelete = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.delete_category,
                data: deleteCategory,
            });

            const { data: responseData } = response;

            if (responseData.success) {
                successAlert(responseData.message);
                fetchCategory();
                fetchDeletedCategories();
                setOpenConfirmBoxDelete(false);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    const handleRestore = async (category) => {
        try {
            const response = await Axios({
                ...SummaryApi.restore_category,
                data: { _id: category._id },
            });

            const { data: responseData } = response;

            if (responseData.success) {
                successAlert(responseData.message);
                fetchCategory();
                fetchDeletedCategories();
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    const handleHardDelete = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.hard_delete_category,
                data: deleteCategory,
            });

            const { data: responseData } = response;

            if (responseData.success) {
                successAlert(responseData.message);
                fetchDeletedCategories();
                setOpenConfirmBoxHardDelete(false);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    // Filter data based on search term
    const filteredData = useMemo(() => {
        const dataToFilter = activeTab === 'active' ? data : deletedData;
        if (!searchTerm.trim()) return dataToFilter;

        const lowerTerm = searchTerm.trim().toLowerCase();
        return dataToFilter.filter((cat) =>
            cat.name.toLowerCase().includes(lowerTerm)
        );
    }, [data, deletedData, searchTerm, activeTab]);

    const renderCategoryCard = (category, index, isDeleted = false) => (
        <div
            key={category._id || index}
            className="block rounded-[28px] liquid-glass border border-input p-2"
        >
            <div>
                <Card className="bg-input hover:bg-transparent rounded-3xl transition-all duration-300 overflow-hidden group relative">
                    {/* Glow effect on hover */}
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-lime-300/20 to-lime-300/10 opacity-0 group-hover:opacity-100 transition-opacity
                            duration-500 pointer-events-none"
                    />

                    {/* Border glow */}
                    <div
                        className="absolute inset-0 rounded-3xl border transition-all duration-500 border-transparent
                                group-hover:border-lime-300/70 group-hover:shadow-[0_0_15px_rgba(132,204,22,0.3)]"
                    />

                    <div className="relative w-full h-full overflow-hidden">
                        <img
                            src={category.image}
                            alt={category.name}
                            className="w-full h-32 sm:h-44 object-cover bg-background transition-transform duration-700 cursor-pointer group-hover:scale-100 group-hover:opacity-80"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/placeholder-category.jpg';
                            }}
                            onClick={() => setImageURL(category.image)}
                        />
                    </div>

                    <CardContent className="px-2 py-3 sm:px-3 sm:py-4 flex flex-col gap-3">
                        <h3 className="text-center font-semibold transition-colors duration-300 line-clamp-2 h-fit w-full">
                            {category.name}
                        </h3>

                        <div className="flex w-full items-center justify-center gap-2">
                            {!isDeleted ? (
                                <>
                                    <GlareHover
                                        background="transparent"
                                        glareOpacity={0.3}
                                        glareAngle={-30}
                                        glareSize={300}
                                        transitionDuration={800}
                                        playOnce={false}
                                        className="flex-1"
                                    >
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenEdit(true);
                                                setEditData(category);
                                            }}
                                            className="bg-muted-foreground hover:bg-muted-foreground w-full"
                                        >
                                            Sửa
                                        </Button>
                                    </GlareHover>
                                    <GlareHover
                                        background="transparent"
                                        glareOpacity={0.3}
                                        glareAngle={-30}
                                        glareSize={300}
                                        transitionDuration={800}
                                        playOnce={false}
                                        className="flex-1"
                                    >
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenConfirmBoxDelete(true);
                                                setDeleteCategory(category);
                                            }}
                                            className="bg-foreground w-full"
                                        >
                                            Xóa
                                        </Button>
                                    </GlareHover>
                                </>
                            ) : (
                                <>
                                    <GlareHover
                                        background="transparent"
                                        glareOpacity={0.3}
                                        glareAngle={-30}
                                        glareSize={300}
                                        transitionDuration={800}
                                        playOnce={false}
                                        className="flex-1"
                                    >
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRestore(category);
                                            }}
                                            className="bg-green-400/80 text-foreground hover:bg-green-700 w-full"
                                            title="Khôi phục"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                    </GlareHover>
                                    <GlareHover
                                        background="transparent"
                                        glareOpacity={0.3}
                                        glareAngle={-30}
                                        glareSize={300}
                                        transitionDuration={800}
                                        playOnce={false}
                                        className="flex-1"
                                    >
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenConfirmBoxHardDelete(
                                                    true
                                                );
                                                setDeleteCategory(category);
                                            }}
                                            className="bg-red-400/80 text-foreground hover:bg-red-700 w-full"
                                            title="Xóa vĩnh viễn"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </GlareHover>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    return (
        <section className="container mx-auto grid gap-2 z-10">
            <Card className="py-6 flex-row justify-between gap-6 border-card-foreground">
                <CardHeader>
                    <CardTitle className="text-lg text-highlight font-bold uppercase">
                        Danh mục
                    </CardTitle>
                    <CardDescription>
                        Quản lý thông tin danh mục
                    </CardDescription>
                </CardHeader>

                <CardFooter className="flex gap-2">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Tìm kiếm danh mục..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <GlareHover
                        background="transparent"
                        glareOpacity={0.3}
                        glareAngle={-30}
                        glareSize={300}
                        transitionDuration={800}
                        playOnce={false}
                    >
                        <Button
                            onClick={() => setOpenUploadCaregory(true)}
                            className="bg-foreground"
                        >
                            Thêm Mới
                        </Button>
                    </GlareHover>
                </CardFooter>
            </Card>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
            >
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="active">
                        Danh mục ({data.length})
                    </TabsTrigger>
                    <TabsTrigger value="deleted">
                        Đã xóa ({deletedData.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4">
                    {!filteredData[0] && !loading && (
                        <NoData message="Chưa có danh mục nào" />
                    )}

                    {loading && <Loading />}

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2 py-2">
                        {filteredData.map((category, index) =>
                            renderCategoryCard(category, index, false)
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="deleted" className="mt-4">
                    {!filteredData[0] && (
                        <NoData message="Không có danh mục đã xóa" />
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2 py-2">
                        {filteredData.map((category, index) =>
                            renderCategoryCard(category, index, true)
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {openUploadCaregory && (
                <UploadCategoryModel
                    fetchData={fetchCategory}
                    close={() => setOpenUploadCaregory(false)}
                />
            )}

            {openEdit && (
                <EditCategory
                    fetchData={fetchCategory}
                    data={editData}
                    close={() => setOpenEdit(false)}
                />
            )}

            {openConfirmBoxDelete && (
                <ConfirmBox
                    confirm={handleSoftDelete}
                    cancel={() => setOpenConfirmBoxDelete(false)}
                    close={() => setOpenConfirmBoxDelete(false)}
                    title="Xóa danh mục"
                    message="Bạn có chắc chắn muốn xóa danh mục này? Bạn có thể khôi phục sau."
                    confirmText="Xóa"
                    cancelText="Hủy"
                />
            )}

            {openConfirmBoxHardDelete && (
                <ConfirmBox
                    confirm={handleHardDelete}
                    cancel={() => setOpenConfirmBoxHardDelete(false)}
                    close={() => setOpenConfirmBoxHardDelete(false)}
                    title="Xóa vĩnh viễn danh mục"
                    message="Bạn có chắc chắn muốn xóa vĩnh viễn danh mục này? Hành động này không thể hoàn tác!"
                    confirmText="Xóa vĩnh viễn"
                    cancelText="Hủy"
                />
            )}

            {imageURL && (
                <ViewImage url={imageURL} close={() => setImageURL('')} />
            )}
        </section>
    );
};

export default CategoryPage;
