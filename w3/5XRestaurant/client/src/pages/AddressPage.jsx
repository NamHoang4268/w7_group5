import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Edit2, Trash2, Home, Building2 } from 'lucide-react';
import Axios from '@/utils/Axios';
import SummaryApi from '@/common/SummaryApi';
import toast from 'react-hot-toast';
import AxiosToastError from '@/utils/AxiosToastError';
import Loading from '@/components/Loading';

const AddressPage = () => {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        label: 'home',
        recipientName: '',
        phone: '',
        address: '',
        city: '',
        district: '',
        ward: '',
        isDefault: false,
    });

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_user_addresses,
            });

            if (response.data.success) {
                setAddresses(response.data.data || []);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            const endpoint = editingId 
                ? { ...SummaryApi.update_address, url: SummaryApi.update_address.url.replace(':id', editingId) }
                : SummaryApi.create_address;

            const response = await Axios({
                ...endpoint,
                data: formData,
            });

            if (response.data.success) {
                toast.success(editingId ? 'Cập nhật địa chỉ thành công' : 'Thêm địa chỉ thành công');
                fetchAddresses();
                resetForm();
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (address) => {
        setFormData({
            label: address.label,
            recipientName: address.recipientName,
            phone: address.phone,
            address: address.address,
            city: address.city,
            district: address.district,
            ward: address.ward,
            isDefault: address.isDefault,
        });
        setEditingId(address._id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;

        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.delete_address,
                url: SummaryApi.delete_address.url.replace(':id', id),
            });

            if (response.data.success) {
                toast.success('Xóa địa chỉ thành công');
                fetchAddresses();
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            label: 'home',
            recipientName: '',
            phone: '',
            address: '',
            city: '',
            district: '',
            ward: '',
            isDefault: false,
        });
        setEditingId(null);
        setShowForm(false);
    };

    const AddressCard = ({ address }) => {
        const Icon = address.label === 'home' ? Home : Building2;

        return (
            <Card 
                className="overflow-hidden transition-all hover:shadow-lg"
                style={{
                    background: 'rgba(var(--card-rgb), 0.95)',
                    backdropFilter: 'blur(20px)',
                    borderColor: address.isDefault ? '#C96048' : undefined,
                    borderWidth: address.isDefault ? '2px' : '1px',
                }}
            >
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5" style={{ color: '#C96048' }} />
                            <span className="font-semibold text-foreground capitalize">
                                {address.label === 'home' ? 'Nhà riêng' : 'Văn phòng'}
                            </span>
                            {address.isDefault && (
                                <span 
                                    className="text-xs px-2 py-0.5 rounded-full text-white"
                                    style={{ background: '#C96048' }}
                                >
                                    Mặc định
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(address)}
                                className="h-8 w-8 p-0"
                            >
                                <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(address._id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-1 text-sm">
                        <p className="font-medium text-foreground">{address.recipientName}</p>
                        <p className="text-muted-foreground">{address.phone}</p>
                        <p className="text-muted-foreground">
                            {address.address}, {address.ward}, {address.district}, {address.city}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (loading && !showForm) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading />
            </div>
        );
    }

    return (
        <div className="container mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Địa chỉ giao hàng</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Quản lý địa chỉ nhận hàng của bạn
                    </p>
                </div>
                {!showForm && (
                    <Button
                        onClick={() => setShowForm(true)}
                        className="text-white"
                        style={{ background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)' }}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm địa chỉ mới
                    </Button>
                )}
            </div>

            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            {editingId ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Loại địa chỉ</Label>
                                    <select
                                        name="label"
                                        value={formData.label}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
                                        required
                                    >
                                        <option value="home">Nhà riêng</option>
                                        <option value="office">Văn phòng</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Người nhận</Label>
                                    <Input
                                        name="recipientName"
                                        value={formData.recipientName}
                                        onChange={handleInputChange}
                                        placeholder="Nhập tên người nhận"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Số điện thoại</Label>
                                <Input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="Nhập số điện thoại"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Địa chỉ</Label>
                                <Input
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="Số nhà, tên đường"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Phường/Xã</Label>
                                    <Input
                                        name="ward"
                                        value={formData.ward}
                                        onChange={handleInputChange}
                                        placeholder="Phường/Xã"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Quận/Huyện</Label>
                                    <Input
                                        name="district"
                                        value={formData.district}
                                        onChange={handleInputChange}
                                        placeholder="Quận/Huyện"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tỉnh/Thành phố</Label>
                                    <Input
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        placeholder="Tỉnh/Thành phố"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="isDefault"
                                    checked={formData.isDefault}
                                    onChange={handleInputChange}
                                    className="w-4 h-4"
                                />
                                <Label>Đặt làm địa chỉ mặc định</Label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="text-white"
                                    style={{ background: 'linear-gradient(135deg, #C96048 0%, #d97a66 100%)' }}
                                >
                                    {loading ? <Loading /> : (editingId ? 'Cập nhật' : 'Thêm địa chỉ')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                    disabled={loading}
                                >
                                    Hủy
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {addresses.length === 0 && !showForm ? (
                    <Card className="col-span-2">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Chưa có địa chỉ nào</p>
                        </CardContent>
                    </Card>
                ) : (
                    addresses.map((address) => (
                        <AddressCard key={address._id} address={address} />
                    ))
                )}
            </div>
        </div>
    );
};

export default AddressPage;
