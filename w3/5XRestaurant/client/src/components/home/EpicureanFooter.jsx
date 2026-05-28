import { Mail, MapPin, Phone } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

export const EpicureanFooter = () => {
    return (
        <footer className="w-full border-t border-border bg-card pb-20 md:pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 px-12 py-16 gap-16 lg:gap-4">
                <div className="space-y-3">
                    <div className="text-lg font-['Noto_Serif'] font-bold text-[#C96048]">
                        EatEase Restaurant
                    </div>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        Trải nghiệm ẩm thực đẳng cấp với những món ăn được chế
                        biến từ nguyên liệu tươi ngon nhất. Phục vụ tận tâm,
                        chất lượng đảm bảo.
                    </p>

                    {/* Contact Info */}
                    <div className="space-y-2 text-sm pt-2 text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-[#C96048]" />
                            <span>+84 123 456 789</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-[#C96048]" />
                            <span>contact@eatease.vn</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#C96048]" />
                            <span>123 Duy Tân, TP. Đà Nẵng</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap justify-center gap-8 font-['Inter'] text-xs uppercase tracking-[0.1em]">
                    <span className="text-muted-foreground">Hours: 8AM - 10PM</span>
                    <a
                        className="text-muted-foreground hover:text-[#C96048] transition-colors"
                        href="#"
                    >
                        Instagram
                    </a>
                    <a
                        className="text-muted-foreground hover:text-[#C96048] transition-colors"
                        href="#"
                    >
                        Facebook
                    </a>
                    <a
                        className="text-muted-foreground hover:text-[#C96048] transition-colors"
                        href="#"
                    >
                        Policy
                    </a>
                    <a
                        className="text-muted-foreground hover:text-[#C96048] transition-colors"
                        href="#"
                    >
                        Privacy
                    </a>
                </div>
            </div>
            {/* Bottom bar */}
            <div
                className="mt-8 flex flex-col items-center justify-between gap-4 border-t
                                border-border p-8 text-xs text-muted-foreground sm:flex-row"
            >
                <p>© 2026 — EatEase Restaurant</p>
                <div className="flex items-center gap-6">
                    <Link
                        to="/privacy"
                        className="hover:text-[#C96048] transition-colors"
                    >
                        Chính Sách Bảo Mật
                    </Link>
                    <Link
                        to="/terms"
                        className="hover:text-[#C96048] transition-colors"
                    >
                        Điều Khoản Sử Dụng
                    </Link>
                </div>
            </div>
        </footer>
    );
};
