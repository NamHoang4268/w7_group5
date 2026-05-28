import React from 'react';
import { Link } from 'react-router-dom';
import VerifyEmailForm from '@/components/verifyEmail/verify-email-form';
import logo from '@/assets/logo2.png';

const VerifyEmail = () => {
    return (
        <div className="grid min-h-svh">
            <div className="overflow-hidden grid">
                <div className="flex flex-col gap-4 p-6 md:p-10">
                    <div className="flex justify-start gap-2 mb-2">
                        <Link
                            to="/"
                            className="flex items-center gap-2 font-bold text-lg text-foreground"
                        >
                            <img src={logo} alt="Logo" width={30} height={30} />
                            EatEase
                        </Link>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                        <div className="w-full md:max-w-md xl:max-w-2xl">
                            <VerifyEmailForm />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
