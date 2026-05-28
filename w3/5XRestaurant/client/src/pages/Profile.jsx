import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import defaultAvatar from '../assets/defaultAvatar.png';
import Axios from '@/utils/Axios';
import SummaryApi from '@/common/SummaryApi';
import fetchUserDetails from '@/utils/fetchUserDetails';
import { setUserDetails, updatedAvatar } from '@/store/userSlice';
import AxiosToastError from '@/utils/AxiosToastError';
import Loading from '@/components/Loading';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlareHover from '@/components/GlareHover';
import ViewImage from '@/components/ViewImage';

const Profile = () => {
    const user = useSelector((state) => state?.user);
    const [userData, setUserData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        mobile: user?.mobile || '',
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [loading, setLoading] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [imageURL, setImageURL] = useState('');

    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const [isModified, setIsModified] = useState(false);
    const [mobileError, setMobileError] = useState('');
    const dispatch = useDispatch();

    const validateMobile = (mobile) => {
        // Vietnamese phone number validation
        // Starts with 0, followed by 9 or 1-9, then 8 more digits (total 10 digits)
        const mobileRegex = /^(0[1-9]|0[1-9][0-9]{8})$/;
        if (!mobile) {
            setMobileError('Vui lòng nhập số điện thoại');
            return false;
        }
        if (!mobileRegex.test(mobile)) {
            setMobileError('Số điện thoại không hợp lệ');
            return false;
        }
        setMobileError('');
        return true;
    };

    useEffect(() => {
        setUserData({
            name: user.name,
            email: user.email,
            mobile: user.mobile,
        });
        setIsModified(false);
    }, [user]);

    // Check if name or mobile has been modified
    useEffect(() => {
        const isNameModified = userData.name !== user.name;
        const isMobileModified = userData.mobile !== user.mobile;
        setIsModified(isNameModified || isMobileModified);
    }, [userData, user.name, user.mobile]);

    const handleOnChange = (e) => {
        const { name, value } = e.target;

        setUserData((prev) => {
            return {
                ...prev,
                [name]: value,
            };
        });

        setPasswordData((prev) => {
            return {
                ...prev,
                [name]: value,
            };
        });
    };

    const handleAvatarSelect = (e) => {
        const file = e.target.files[0];

        if (!file) {
            return;
        }

        // Validate file type
        const validTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
        ];
        if (!validTypes.includes(file.type)) {
            toast.error('Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.error('Kích thước ảnh không được vượt quá 5MB');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setAvatarPreview(e.target.result);
        };
        reader.readAsDataURL(file);

        setSelectedAvatar(file);
    };

    const handleUploadAvatar = async () => {
        if (!selectedAvatar) {
            return;
        }

        const formData = new FormData();
        formData.append('avatar', selectedAvatar);

        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.upload_avatar,
                data: formData,
                headers: {
                    'Content-Type': undefined, // Remove to let browser set multipart/form-data with boundary
                },
            });

            const { data: responseData } = response;

            if (responseData.success) {
                toast.success(
                    responseData.message || 'Cập nhật avatar thành công'
                );
                dispatch(updatedAvatar(responseData.data.avatar));
                // Reset states
                setSelectedAvatar(null);
                setAvatarPreview(null);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelAvatarChange = () => {
        setSelectedAvatar(null);
        setAvatarPreview(null);
        // Reset input
        const input = document.getElementById('uploadProfile');
        if (input) {
            input.value = '';
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        // Validate mobile number before submission
        if (!validateMobile(userData.mobile)) {
            return;
        }

        try {
            setLoading(true);

            const response = await Axios({
                ...SummaryApi.update_user,
                data: userData,
            });

            const { data: responseData } = response;

            if (responseData.success) {
                toast.success(responseData.message);
                const userData = await fetchUserDetails();
                dispatch(setUserDetails(userData.data));
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitChangePassword = async (e) => {
        e.preventDefault();

        if (!passwordData.currentPassword) {
            toast.error('Vui lòng nhập mật khẩu hiện tại');
            return;
        }

        try {
            setLoading(true);
            // First verify the current password
            const response = await Axios({
                ...SummaryApi.verify_password,
                data: {
                    password: passwordData.currentPassword,
                },
            });

            if (response.data.success) {
                // Show success toast
                toast.success(
                    response.data.message || 'Xác thực mật khẩu thành công'
                );

                // If password is correct, navigate to reset password page
                close();
                navigate('/reset-password', {
                    state: {
                        email: response.data.email,
                        userId: response.data.userId,
                        currentPassword: passwordData.currentPassword,
                        fromProfile: true,
                        fromForgotPassword: false,
                    },
                    replace: true,
                });
            }
        } catch (error) {
            const newFailedAttempts = failedAttempts + 1;
            setFailedAttempts(newFailedAttempts);

            if (newFailedAttempts >= 3) {
                setShowForgotPassword(true);
                toast.error(
                    'Bạn đã nhập sai mật khẩu quá 3 lần. Vui lòng thử lại sau hoặc sử dụng chức năng quên mật khẩu.'
                );
            } else {
                AxiosToastError(error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto grid gap-2 z-10">
            <Tabs defaultValue="account" className="space-y-2">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="account">Tài Khoản</TabsTrigger>
                    <TabsTrigger value="password">Đổi Mật Khẩu</TabsTrigger>
                </TabsList>
                <TabsContent value="account">
                    <Card className="space-y-4 py-6">
                        <form onSubmit={handleUpdateProfile}>
                            <CardHeader className="pb-6">
                                <CardTitle className="text-lg text-highlight font-bold uppercase">
                                    Tài khoản
                                </CardTitle>
                                <CardDescription>
                                    Quản lý thông tin tài khoản
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <Label>Avatar Hiện Tại</Label>
                                    <div className="grid justify-items-center justify-start gap-2.5">
                                        <div className="flex items-center space-x-4 relative">
                                            <div
                                                className="cursor-pointer"
                                                onClick={() =>
                                                    setImageURL(
                                                        avatarPreview ||
                                                            user?.avatar ||
                                                            defaultAvatar
                                                    )
                                                }
                                            >
                                                <Avatar className="h-20 w-20 hover:opacity-80 transition-opacity">
                                                    <AvatarImage
                                                        src={
                                                            avatarPreview ||
                                                            user?.avatar ||
                                                            defaultAvatar
                                                        }
                                                        alt={
                                                            user?.name || 'User'
                                                        }
                                                        className="object-cover"
                                                    />
                                                    <AvatarFallback>
                                                        {(user?.name || 'U')
                                                            .split(' ')
                                                            .map((n) => n[0])
                                                            .join('')}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                            {avatarPreview && (
                                                <div className="absolute top-0 right-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-xs">
                                                        *
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <Label
                                                htmlFor="uploadProfile"
                                                className="text-sm border border-primary rounded-lg px-2 py-1 cursor-pointer hover:opacity-80"
                                            >
                                                {loading
                                                    ? 'Đang tải lên...'
                                                    : selectedAvatar
                                                    ? 'Đổi ảnh'
                                                    : 'Chọn ảnh'}
                                            </Label>
                                            <Input
                                                onChange={handleAvatarSelect}
                                                type="file"
                                                accept="image/*"
                                                id="uploadProfile"
                                                className="hidden"
                                                disabled={loading}
                                            />
                                        </div>
                                        {selectedAvatar && (
                                            <div className="flex gap-2 mt-2">
                                                <Button
                                                    onClick={handleUploadAvatar}
                                                    disabled={loading}
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    {loading ? (
                                                        <Loading />
                                                    ) : (
                                                        'Xác nhận thay đổi'
                                                    )}
                                                </Button>
                                                <Button
                                                    onClick={
                                                        handleCancelAvatarChange
                                                    }
                                                    disabled={loading}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Hủy
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="full-name">Họ và Tên</Label>
                                    <Input
                                        type="text"
                                        placeholder="Nhập họ và tên"
                                        value={userData.name}
                                        name="name"
                                        onChange={handleOnChange}
                                        required
                                        spellCheck={false}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        type="email"
                                        value={userData.email}
                                        name="email"
                                        onChange={handleOnChange}
                                        required
                                        disabled
                                        spellCheck={false}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Số Điện Thoại</Label>
                                    <Input
                                        type="tel"
                                        placeholder="Nhập số điện thoại"
                                        value={userData.mobile}
                                        name="mobile"
                                        onChange={(e) => {
                                            handleOnChange(e);
                                            // Clear error when user starts typing
                                            if (mobileError) {
                                                validateMobile(e.target.value);
                                            }
                                        }}
                                        onBlur={(e) =>
                                            validateMobile(e.target.value)
                                        }
                                        required
                                        spellCheck={false}
                                        className={cn(
                                            mobileError
                                                ? 'border-red-500 focus-visible:ring-red-500'
                                                : ''
                                        )}
                                    />
                                    {mobileError && (
                                        <p className="text-sm text-red-500 mt-1">
                                            {mobileError}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-6">
                                <GlareHover
                                    background="transparent"
                                    glareOpacity={0.3}
                                    glareAngle={-30}
                                    glareSize={300}
                                    transitionDuration={800}
                                    playOnce={false}
                                    className={`${
                                        !mobileError && !isModified
                                            ? 'cursor-not-allowed'
                                            : 'cursor-pointer'
                                    }`}
                                >
                                    <Button
                                        disabled={!mobileError && !isModified}
                                        type="submit"
                                        className="bg-foreground"
                                    >
                                        {loading ? <Loading /> : 'Lưu Thay Đổi'}
                                    </Button>
                                </GlareHover>
                            </CardFooter>
                        </form>
                    </Card>
                </TabsContent>
                <TabsContent value="password">
                    <Card className="space-y-4 py-6">
                        <form onSubmit={handleSubmitChangePassword}>
                            <CardHeader className="pb-6">
                                <CardTitle className="text-lg text-highlight font-bold uppercase">
                                    Xác minh danh tính
                                </CardTitle>
                                <CardDescription>
                                    Vì lý do bảo mật, vui lòng nhập mật khẩu
                                    hiện tại của bạn để tiếp tục.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPassword">
                                        Mật Khẩu Hiện Tại
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            name="currentPassword"
                                            value={passwordData.currentPassword}
                                            onChange={handleOnChange}
                                            placeholder="Nhập mật khẩu hiện tại"
                                            required
                                            className="text-sm h-12"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent cursor-pointer"
                                            onClick={() =>
                                                setShowPassword(!showPassword)
                                            }
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-6">
                                <GlareHover
                                    background="transparent"
                                    glareOpacity={0.3}
                                    glareAngle={-30}
                                    glareSize={300}
                                    transitionDuration={800}
                                    playOnce={false}
                                    className={`${
                                        !mobileError && !isModified
                                            ? 'cursor-not-allowed'
                                            : 'cursor-pointer'
                                    }`}
                                >
                                    <Button
                                        type="submit"
                                        className="bg-foreground"
                                    >
                                        {loading ? <Loading /> : 'Tiếp Tục'}
                                    </Button>
                                </GlareHover>
                            </CardFooter>
                        </form>
                    </Card>
                </TabsContent>
            </Tabs>

            {imageURL && (
                <ViewImage url={imageURL} close={() => setImageURL('')} />
            )}
        </div>
    );
};

export default Profile;
