import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import GlareHover from '@/components/GlareHover';
import Divider from '@/components/Divider';

const BookingSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');

    return (
        <section className="container mx-auto py-12 px-4">
            <Card className="max-w-2xl mx-auto border-green-600 border-2 py-6">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl text-green-600 font-bold">
                        🎉 Đặt bàn thành công!
                    </CardTitle>
                    <CardDescription className="text-lg mt-4">
                        {sessionId
                            ? 'Cảm ơn bạn đã thanh toán tiền cọc. Đặt bàn của bạn đã được xác nhận.'
                            : 'Cảm ơn bạn đã đặt bàn tại nhà hàng của chúng tôi.'}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="bg-foreground/20 p-6 rounded-lg space-y-3 text-center">
                        <p className="text-foreground">
                            Chúng tôi đã gửi email xác nhận đến hộp thư của bạn.
                            <br />
                            Vui lòng kiểm tra cả hộp thư Spam nếu không thấy
                            email.
                        </p>
                    </div>

                    <div className="space-y-3 text-sm">
                        <p className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>
                                {sessionId
                                    ? 'Thanh toán tiền cọc đã được ghi nhận.'
                                    : 'Yêu cầu đặt bàn của bạn đang chờ xác nhận.'}
                            </span>
                        </p>
                        <p className="flex items-start gap-2">
                            <span className="text-green-600">✓</span>
                            <span>
                                Vui lòng đến đúng giờ để chúng tôi có thể phục
                                vụ bạn tốt nhất.
                            </span>
                        </p>
                    </div>

                    <Divider />

                    <div className="flex gap-4 justify-center pt-4">
                        <Link to="/booking">
                            <Button variant="outline">Đặt bàn khác</Button>
                        </Link>

                        <GlareHover
                            background="transparent"
                            glareOpacity={0.3}
                            glareAngle={-30}
                            glareSize={300}
                            transitionDuration={800}
                            playOnce={false}
                        >
                            <Link to="/">
                                <Button className="bg-foreground">
                                    Về trang chủ
                                </Button>
                            </Link>
                        </GlareHover>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
};

export default BookingSuccessPage;
