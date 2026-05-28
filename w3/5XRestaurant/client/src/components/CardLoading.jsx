import React from 'react';

const CardLoading = () => {
    return (
        <div
            className="border rounded-xl cursor-pointer bg-white
        animate-pulse overflow-hidden"
        >
            <div className="w-full h-40 sm:h-48 lg:h-52 xl:h-56 overflow-hidden">
                <div className="w-full h-full bg-blue-100"></div>
            </div>
            <div className="px-2 pt-2 pb-2 md:px-3 md:pt-4 md:pb-5 flex flex-col gap-2 lg:gap-2">
                <div className="p-2 lg:p-3 bg-blue-100 rounded"></div>
                <div className="p-2 lg:p-3 bg-blue-100 rounded"></div>
                <div className="p-3 lg:p-4 bg-blue-100 rounded w-14"></div>

                <div className="flex md:flex-row flex-col md:items-center justify-between gap-3">
                    <div className="p-3 lg:p-4 bg-blue-100 rounded md:w-20 w-28"></div>
                    <div className="p-3 lg:p-3 bg-blue-100 rounded w-20"></div>
                </div>
            </div>
        </div>
    );
};

export default CardLoading;
