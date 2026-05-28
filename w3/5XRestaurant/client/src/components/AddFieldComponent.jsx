import React from 'react';
import { IoClose } from 'react-icons/io5';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from '@radix-ui/react-label';
import { Input } from './ui/input';
import GlareHover from './GlareHover';

const AddFieldComponent = ({ close, value, onChange, onSubmit }) => {
    return (
        <section
            onClick={close}
            className="bg-neutral-800 z-50 bg-opacity-60 fixed top-0 left-0 right-0 bottom-0 overflow-auto
        flex items-center justify-center px-2"
        >
            <Card
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md overflow-hidden border-foreground"
            >
                {/* Header */}
                <CardHeader className="border-b border-gray-200 py-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-highlight font-bold uppercase">
                            Thêm trường mới
                        </CardTitle>
                        <Button
                            onClick={close}
                            className="bg-transparent hover:bg-transparent text-foreground
                        hover:text-highlight h-12"
                        >
                            <IoClose />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="py-4 space-y-6 text-sm">
                    <div className="space-y-2">
                        <Label htmlFor="fieldName">
                            Tên trường <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="text"
                            id="fieldName"
                            name="fieldName"
                            autoFocus
                            value={value}
                            onChange={onChange}
                            className="text-sm h-12"
                            placeholder="Nhập tên trường"
                            required
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <GlareHover
                            background="transparent"
                            glareOpacity={0.3}
                            glareAngle={-30}
                            glareSize={300}
                            transitionDuration={800}
                            playOnce={false}
                        >
                            <Button
                                onClick={close}
                                className="bg-muted-foreground hover:bg-muted-foreground w-full"
                            >
                                Huỷ
                            </Button>
                        </GlareHover>
                        <GlareHover
                            background="transparent"
                            glareOpacity={0.3}
                            glareAngle={-30}
                            glareSize={300}
                            transitionDuration={800}
                            playOnce={false}
                            title={!value ? 'Vui lòng nhập tên trường' : ''}
                        >
                            <Button
                                disabled={!value}
                                onClick={onSubmit}
                                className="bg-foreground w-full"
                            >
                                Thêm
                            </Button>
                        </GlareHover>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
};

export default AddFieldComponent;
