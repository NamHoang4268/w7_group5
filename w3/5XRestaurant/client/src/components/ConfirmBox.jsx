import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import Loading from './Loading';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import GlareHover from './GlareHover';

const ConfirmBox = ({
    cancel,
    confirm,
    close,
    title,
    message,
    confirmText = "Xác nhận",
    cancelText = "Hủy bỏ",
}) => {
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

    return (
        <section
            onClick={close}
            className="bg-neutral-950/65 z-50 fixed top-0 left-0 right-0 bottom-0 overflow-auto
            flex items-center justify-center px-2 transition-transform duration-500 ease-in hover:scale-[1.01]"
        >
            <Card
                onClick={(e) => e.stopPropagation()}
                className="py-6 w-full max-w-md mx-auto rounded-md shadow-md grid gap-4 border-foreground"
            >
                <CardHeader className="flex justify-between items-center gap-4">
                    <CardTitle className="font-semibold sm:text-lg text-base text-highlight">
                        {title}
                    </CardTitle>
                    <Button
                        onClick={close}
                        className="bg-transparent hover:bg-transparent text-foreground
                        hover:text-highlight"
                    >
                        <IoClose />
                    </Button>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <p className="text-sm font-medium">{message}</p>
                    <div className="flex gap-4 w-fit ml-auto">
                        <div>
                            <GlareHover
                                background="transparent"
                                glareOpacity={0.3}
                                glareAngle={-30}
                                glareSize={300}
                                transitionDuration={800}
                                playOnce={false}
                                className="flex-1"
                            >
                                <Button
                                    onClick={async () => {
                                        setConfirmLoading(true);
                                        try {
                                            await Promise.resolve(confirm());
                                        } finally {
                                            setConfirmLoading(false);
                                        }
                                    }}
                                    disabled={cancelLoading}
                                    className="px-6 bg-baseColor hover:bg-baseColor_2"
                                >
                                    {confirmLoading ? <Loading /> : confirmText}
                                </Button>
                            </GlareHover>
                        </div>

                        <div>
                            <GlareHover
                                glareOpacity={0.3}
                                glareAngle={-30}
                                glareSize={300}
                                transitionDuration={800}
                                playOnce={false}
                                className="flex-1"
                            >
                                <Button
                                    onClick={async () => {
                                        setCancelLoading(true);
                                        try {
                                            if (cancel) {
                                                await Promise.resolve(cancel());
                                            } else if (close) {
                                                close();
                                            }
                                        } finally {
                                            setCancelLoading(false);
                                        }
                                    }}
                                    disabled={confirmLoading}
                                    className="px-6 text-white"
                                >
                                    {cancelLoading ? <Loading /> : cancelText}
                                </Button>
                            </GlareHover>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
};

export default ConfirmBox;
