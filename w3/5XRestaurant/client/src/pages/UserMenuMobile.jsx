import React from 'react';
import UserMenu from '../components/UserMenu';
import { FaLongArrowAltLeft } from 'react-icons/fa';

const UserMenuMobile = () => {
    return (
        <section className="bg-white h-full w-full py-7 px-5 mt-2 shadow-lg">
            <div className="container mx-auto pb-4 flex items-start gap-4">
                <button
                    onClick={() => window.history.back()}
                    className="text-secondary-200 hover:opacity-70 mb-[1px]"
                >
                    <FaLongArrowAltLeft size={22} />
                </button>
                <div className="w-full">
                    <UserMenu />
                </div>
            </div>
        </section>
    );
};

export default UserMenuMobile;
