import React, { useEffect, useState, useCallback, useRef } from 'react';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import Loading from '../components/Loading';
import NoData from '../components/NoData';
import { IoArrowBack, IoArrowForward, IoSearch } from 'react-icons/io5';
import { debounce } from 'lodash';
import UploadProductModel from '../components/UploadProductModel';
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import GlareHover from '@/components/GlareHover';
import { Button } from '@/components/ui/button';
import { FaFilter } from 'react-icons/fa6';
import { RiResetLeftFill } from 'react-icons/ri';
import { Label } from '@radix-ui/react-label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import ProductManagementCart from '../components/ProductManagementCart';

const ProductManagementPage = () => {
    const [productData, setProductData] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [totalPageCount, setTotalPageCount] = useState(1);
    const [search, setSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [categories, setCategories] = useState([]);
    const [filters, setFilters] = useState({
        minPrice: '',
        maxPrice: '',
        sortBy: 'newest',
        category: 'all',
    });
    const [openUploadProduct, setOpenUploadProduct] = useState(false);

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            const response = await Axios({
                ...SummaryApi.get_category,
                method: 'get',
            });
            if (response.data.success) {
                setCategories(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }, []);

    const fetchProduct = useCallback(
        async (
            searchTerm = search,
            filterValues = filters,
            currentPage = page
        ) => {
            const accessToken = localStorage.getItem('accesstoken');
            if (!accessToken) return;

            try {
                setLoading(true);

                // Prepare request data with proper parameter names
                const requestData = {
                    page: currentPage,
                    limit: 15,
                    search: searchTerm.trim(),
                    minPrice: filterValues.minPrice
                        ? Number(filterValues.minPrice)
                        : undefined,
                    maxPrice: filterValues.maxPrice
                        ? Number(filterValues.maxPrice)
                        : undefined,
                    sort: filterValues.sortBy,
                    category:
                        filterValues.category !== 'all'
                            ? filterValues.category
                            : undefined,
                };

                // Clean up undefined values
                Object.keys(requestData).forEach((key) => {
                    if (
                        requestData[key] === undefined ||
                        requestData[key] === ''
                    ) {
                        delete requestData[key];
                    }
                });

                const response = await Axios({
                    ...SummaryApi.get_product,
                    data: requestData,
                });

                if (response.data.success) {
                    setTotalPageCount(response.data.totalNoPage);
                    setProductData(response.data.data);
                }
            } catch (error) {
                AxiosToastError(error);
            } finally {
                setLoading(false);
            }
        },
        [search, filters, page]
    );

    // Reset all filters
    const resetFilters = () => {
        const resetFilters = {
            minPrice: '',
            maxPrice: '',
            sortBy: 'newest',
            category: 'all',
        };
        setFilters(resetFilters);
        setPage(1);
        setSearch('');
        // Fetch products with reset filters
        fetchProduct('', resetFilters, 1);
    };

    const handleOnChange = (e) => {
        const { value } = e.target;
        setSearch(value);
        setPage(1);
        debouncedSearch(value, filters, 1);
    };

    // Debounced search function
    const debouncedSearch = useRef(
        debounce((searchTerm, filterValues, currentPage) => {
            fetchProduct(searchTerm, filterValues, currentPage);
        }, 500)
    ).current;

    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;

        if (
            (name === 'minPrice' || name === 'maxPrice') &&
            value !== '' &&
            !/^\d*$/.test(value)
        ) {
            return;
        }

        const newFilters = {
            ...filters,
            [name]: value,
        };

        setFilters(newFilters);
        setPage(1);
        debouncedSearch(search, newFilters, 1);
    };

    // Handle page changes
    const handlePageChange = (newPage) => {
        setPage(newPage);
        fetchProduct(search, filters, newPage);
    };

    // Initial data fetch
    useEffect(() => {
        fetchCategories();
        fetchProduct();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleNextPage = () => {
        if (page < totalPageCount) {
            handlePageChange(page + 1);
        }
    };

    const handlePreviousPage = () => {
        if (page > 1) {
            handlePageChange(page - 1);
        }
    };

    // Render filter controls
    const renderFilterControls = () => (
        <div
            className="liquid-glass-header p-4 rounded-lg shadow-lg mb-4 border border-secondary-100
        text-secondary-200 sm:text-base text-sm"
        >
            <div className="flex justify-between items-center mb-4 text-foreground">
                <h2 className="uppercase drop-shadow-[0_0_20px_rgba(132,204,22,0.35)]">
                    Bộ lọc
                </h2>
                <button
                    onClick={resetFilters}
                    className="hover:bg-background/80 hover:border-emerald-500 flex items-center gap-2 bg-background/20
                    transition-all duration-300 border-2 border-highlight px-4 py-1.5 rounded-md"
                >
                    <RiResetLeftFill />
                    Đặt lại
                </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 sm:text-sm text-xs">
                    <Label htmlFor="email">Giá từ</Label>
                    <Input
                        type="text"
                        name="minPrice"
                        value={filters.minPrice}
                        onChange={handleFilterChange}
                        placeholder="Thấp nhất"
                        className="w-24 text-sm placeholder:text-highlight"
                    />
                    <span>-</span>
                    <Input
                        type="text"
                        name="maxPrice"
                        value={filters.maxPrice}
                        onChange={handleFilterChange}
                        placeholder="Cao nhất"
                        className="w-24 text-sm placeholder:text-highlight"
                    />
                    <span className="">VNĐ</span>
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                    <Label htmlFor="email">Sắp xếp</Label>
                    <Select
                        value={filters.sortBy}
                        onValueChange={(value) =>
                            handleFilterChange({
                                target: { name: 'sortBy', value },
                            })
                        }
                    >
                        <SelectTrigger className="w-32 text-sm">
                            <SelectValue placeholder="Sắp xếp" />
                        </SelectTrigger>

                        <SelectContent className="cursor-pointer">
                            <SelectItem
                                value="newest"
                                className="cursor-pointer"
                            >
                                Mới nhất
                            </SelectItem>
                            <SelectItem value="price_asc">
                                Giá tăng dần
                            </SelectItem>
                            <SelectItem value="price_desc">
                                Giá giảm dần
                            </SelectItem>
                            <SelectItem value="name_asc">Tên A-Z</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                    <Label htmlFor="email">Danh mục</Label>
                    <Select
                        value={filters.category}
                        onValueChange={(value) =>
                            handleFilterChange({
                                target: { name: 'category', value },
                            })
                        }
                    >
                        <SelectTrigger className="w-40 text-sm">
                            <SelectValue placeholder="Danh mục" />
                        </SelectTrigger>

                        <SelectContent className="cursor-pointer">
                            <SelectItem value="all" className="cursor-pointer">
                                Tất cả
                            </SelectItem>
                            {categories.map((category) => (
                                <SelectItem
                                    key={category._id}
                                    value={category._id}
                                >
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );

    return (
        <section className="container mx-auto grid gap-2 z-10">
            {/* Header */}
            <Card className="py-6 flex-row justify-between gap-6 border-card-foreground">
                <CardHeader>
                    <CardTitle className="text-lg text-highlight font-bold uppercase">
                        Sản phẩm
                    </CardTitle>
                    <CardDescription>Quản lý sản phẩm của bạn</CardDescription>
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
                            onClick={() => setOpenUploadProduct(true)}
                            className="bg-foreground"
                        >
                            Thêm Mới
                        </Button>
                    </GlareHover>
                </CardFooter>
            </Card>
            <div className="flex items-center gap-3 text-sm mt-1.5">
                {/* Filter Button */}
                <GlareHover
                    glareColor="#ffffff"
                    glareOpacity={0.8}
                    glareAngle={-30}
                    glareSize={300}
                    transitionDuration={800}
                    playOnce={false}
                >
                    <Button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 text-foreground h-11 w-full bg-background hover:bg-transparent"
                    >
                        <FaFilter className="mb-[3px]" />
                        <span className="font-bold uppercase">Lọc</span>
                    </Button>
                </GlareHover>

                {/* Search */}
                <div
                    className="text-foreground h-11 max-w-72 w-full min-w-16 lg:min-w-24 bg-background/80 border border-muted-foreground px-4
                flex items-center gap-3 rounded-xl shadow-md shadow-secondary-100 focus-within:border-lime-200"
                >
                    <IoSearch size={22} className="mb-[3px] sm:block hidden" />
                    <IoSearch
                        size={16}
                        className="mb-[1.5px] block sm:hidden"
                    />
                    <input
                        type="text"
                        placeholder="Tìm kiếm sản phẩm..."
                        className="h-full w-full outline-none bg-transparent placeholder:text-foreground"
                        value={search}
                        onChange={handleOnChange}
                        spellCheck={false}
                    />
                </div>
            </div>

            {showFilters && renderFilterControls()}

            {!productData[0] && !loading && <NoData />}

            {loading ? (
                <div className="flex justify-center items-center py-2">
                    <Loading />
                </div>
            ) : (
                <div className="">
                    <div className="min-h-[65vh]">
                        <div className="pt-2 pb-8 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-[10px] sm:gap-6">
                            {productData.map((product, index) => (
                                <ProductManagementCart
                                    key={product._id || index}
                                    data={product}
                                    fetchProduct={fetchProduct}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between px-4">
                        <button
                            onClick={handlePreviousPage}
                            disabled={page === 1}
                            className={`flex items-center gap-1 px-3 py-1 rounded h-10 ${
                                page === 1
                                    ? 'bg-gray-200/80 text-gray-500 cursor-not-allowed opacity-80'
                                    : 'bg-black/80 border-2 border-slate-700 text-lime-300 hover:bg-white/20'
                            }`}
                        >
                            <IoArrowBack size={20} />
                            <span className="hidden sm:inline">Trước</span>
                        </button>

                        <div className="flex items-center font-bold text-sm text-secondary-200">
                            Trang {page} / {totalPageCount}
                        </div>

                        <button
                            onClick={handleNextPage}
                            disabled={page === totalPageCount}
                            className={`flex items-center gap-1 px-3 py-1 rounded h-10 ${
                                page === totalPageCount
                                    ? 'bg-gray-200/80 text-gray-500 cursor-not-allowed opacity-80'
                                    : 'bg-black/80 border-2 border-slate-700 text-lime-300 hover:bg-white/20'
                            }`}
                        >
                            <span className="hidden sm:inline">Tiếp</span>
                            <IoArrowForward size={20} />
                        </button>
                    </div>
                    <div className="p-[0.5px] bg-slate-300 my-4"></div>
                </div>
            )}

            {/* Upload Product Modal */}
            {openUploadProduct && (
                <UploadProductModel
                    fetchData={fetchProduct}
                    close={() => setOpenUploadProduct(false)}
                />
            )}
        </section>
    );
};

export default ProductManagementPage;
