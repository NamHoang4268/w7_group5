import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoExpand, IoContract } from 'react-icons/io5';
import { FaSpinner } from 'react-icons/fa';

const ViewImage = ({ url, close }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [imageSize, setImageSize] = useState({
        width: 'auto',
        height: 'auto',
    });

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === 'Escape') {
                close();
            }
        },
        [close]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    const handleImageLoad = (e) => {
        setIsLoading(false);
        setImageSize({
            width: e.target.naturalWidth,
            height: e.target.naturalHeight,
        });
    };

    const handleImageError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    const toggleZoom = () => {
        setIsZoomed(!isZoomed);
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
            onClick={(e) => {
                e.stopPropagation();
                if (e.target === e.currentTarget) {
                    close();
                }
            }}
            className="fixed inset-0 bg-neutral-800 bg-opacity-75 z-50 p-4 flex items-center justify-center transition-opacity duration-300"
        >
            <div
                className={`relative liquid-glass rounded-lg overflow-hidden transition-all duration-300 ${
                    isZoomed ? 'w-[95vw] h-[95vh]' : 'max-w-4xl max-h-[90vh]'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-2 right-2 flex gap-2 z-10 text-white">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleZoom();
                        }}
                        className="p-2 bg-black/80 rounded-full shadow-md hover:opacity-80 transition-colors"
                        aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
                        title={isZoomed ? 'Zoom out' : 'Zoom in'}
                    >
                        {isZoomed ? (
                            <IoContract size={20} />
                        ) : (
                            <IoExpand size={20} />
                        )}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            close();
                        }}
                        className="p-2 bg-black/80 rounded-full shadow-md hover:opacity-80 transition-colors"
                        aria-label="Close image viewer"
                        title="Close (Esc)"
                    >
                        <IoClose size={20} />
                    </button>
                </div>

                <div className="w-full h-full flex items-center justify-center p-4">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center p-8">
                            <FaSpinner className="animate-spin text-4xl text-gray-600 mb-2" />
                            <p className="text-gray-700">Loading image...</p>
                        </div>
                    )}

                    {hasError ? (
                        <div className="text-center p-8">
                            <p className="text-red-600 font-medium">
                                Failed to load image
                            </p>
                            <p className="text-gray-600 mt-2">
                                The image could not be loaded.
                            </p>
                            <button
                                onClick={() => {
                                    setHasError(false);
                                    setIsLoading(true);
                                }}
                                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <img
                            src={url}
                            alt="Full screen preview"
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                                isLoading ? 'opacity-0' : 'opacity-100'
                            }`}
                            style={
                                isZoomed
                                    ? { cursor: 'zoom-out' }
                                    : { cursor: 'zoom-in' }
                            }
                            onClick={toggleZoom}
                        />
                    )}
                </div>

                {!isLoading && !hasError && (
                    <div className="absolute bottom-4 left-0 right-0 font-bold text-center text-sm text-orange-400">
                        {imageSize.width} × {imageSize.height}px
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(ViewImage);
