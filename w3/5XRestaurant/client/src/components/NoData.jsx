import React from 'react';
import noDataImage from '../assets/nodata.png';

const NoData = ({ message = '' }) => {
    return (
        <div className="grid justify-items-center w-full mx-auto p-4 liquid-glass-header rounded-lg">
            <img
                src={noDataImage}
                alt="No Data"
                className="w-full h-full sm:max-w-xs max-w-56 block"
            />
            <p className="text-foreground uppercase font-bold">{message}</p>
        </div>
    );
};

export default NoData;
