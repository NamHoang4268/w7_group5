import { ResetPasswordForm } from '@/components/resetPassword/reset-password-form';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo2.png';

export default function ResetPasswordPage() {
    return (
        <div className="grid min-h-screen">
            <div className="overflow-hidden grid">
                <div className="flex flex-col gap-4 p-6 md:p-10">
                    <div className="flex justify-center gap-2 md:justify-start mb-2">
                        <Link
                            to="/"
                            className="flex items-center gap-2 font-bold text-lg"
                        >
                            <img src={logo} alt="Logo" width={30} height={30} />
                            EatEase
                        </Link>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                        <div className="w-full md:max-w-md xl:max-w-2xl">
                            <ResetPasswordForm />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
