import type React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import GlareHover from '../GlareHover';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Axios from '@/utils/Axios';
import SummaryApi from '@/common/SummaryApi';
import toast from 'react-hot-toast';
import AxiosToastError from '@/utils/AxiosToastError';
import Loading from '../Loading';
import { Eye, EyeOff } from 'lucide-react';
import { IoIosArrowRoundBack } from 'react-icons/io';

export function ResetPasswordForm({
    className,
    ...props
}: React.ComponentPropsWithoutRef<'form'>) {
    const [data, setData] = useState({
        email: '',
        newPassword: '',
        confirmNewPassword: '',
    });

    const location = useLocation();
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (location?.state?.fromForgotPassword && !location?.state?.email) {
            navigate('/');
            return;
        }

        if (location?.state?.email) {
            setData((prev) => ({
                ...prev,
                email: location.state.email,
            }));
        }
    }, [location, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setData((prev) => {
            return {
                ...prev,
                [name]: value,
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!data.newPassword || !data.confirmNewPassword) {
            toast.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        if (data.newPassword !== data.confirmNewPassword) {
            toast.error('Mật khẩu mới và xác nhận mật khẩu không khớp');
            return;
        }

        if (data.newPassword.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        if (
            location?.state?.fromProfile &&
            data.newPassword === location.state.currentPassword
        ) {
            toast.error('Mật khẩu mới phải khác mật khẩu hiện tại');
            return;
        }

        try {
            setLoading(true);

            const isChangePasswordFlow = location?.state?.fromProfile;
            const requestData = isChangePasswordFlow
                ? {
                      userId: location.state.userId,
                      newPassword: data.newPassword,
                      confirmNewPassword: data.confirmNewPassword,
                  }
                : {
                      email: data.email || '',
                      newPassword: data.newPassword,
                      confirmNewPassword: data.confirmNewPassword,
                  };

            const response = await Axios({
                ...(isChangePasswordFlow
                    ? SummaryApi.change_password
                    : SummaryApi.reset_password),
                data: requestData,
            });

            if (response.data.error) {
                toast.error(response.data.message);
                return;
            }

            if (response.data.success) {
                toast.success(response.data.message);

                if (location?.state?.fromProfile) {
                    navigate('/dashboard/profile');
                } else {
                    navigate('/login');
                }

                setData({
                    email: '',
                    newPassword: '',
                    confirmNewPassword: '',
                });
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            className={cn(
                'flex flex-col gap-6 font-semibold text-foreground',
                className
            )}
            {...props}
            onSubmit={handleSubmit}
        >
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-semibold">Đổi mật khẩu</h1>
                <p className="text-balance text-sm">
                    Nhập mật khẩu mới của bạn và xác nhận để cập nhật mật khẩu
                    tài khoản.
                </p>
            </div>
            <div className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="newPassword">Mật khẩu mới</Label>
                    <div className="relative">
                        <Input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            name="newPassword"
                            autoFocus
                            placeholder="Nhập mật khẩu mới"
                            onChange={handleChange}
                            value={data.newPassword}
                            className="h-12 pr-10 border-muted-foreground border-2 focus:ring-0 shadow-none rounded-lg bg-white/20 focus:border-[#3F3FF3]"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent cursor-pointer"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                            {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="confirmNewPassword">
                        Xác nhận mật khẩu mới
                    </Label>
                    <div className="relative">
                        <Input
                            id="confirmNewPassword"
                            type={showConfirmNewPassword ? 'text' : 'password'}
                            name="confirmNewPassword"
                            placeholder="Nhập lại mật khẩu để xác nhận"
                            onChange={handleChange}
                            value={data.confirmNewPassword}
                            className="h-12 pr-10 border-muted-foreground border-2 focus:ring-0 shadow-none rounded-lg bg-white/20 focus:border-[#3F3FF3]"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent cursor-pointer"
                            onClick={() =>
                                setShowConfirmNewPassword(
                                    !showConfirmNewPassword
                                )
                            }
                        >
                            {showConfirmNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
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
                        type="submit"
                        className="bg-foreground w-full h-12 font-bold"
                    >
                        {loading ? <Loading /> : 'Xác nhận'}
                    </Button>
                </GlareHover>
            </div>
            <Link
                to={'/login'}
                className="text-center text-sm flex justify-center items-center gap-2
                hover:opacity-80 cursor-pointer text-highlight"
            >
                <IoIosArrowRoundBack size={28} className="mb-0.5" />
                Quay lại.
            </Link>
        </form>
    );
}
