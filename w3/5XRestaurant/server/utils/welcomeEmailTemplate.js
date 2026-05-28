const welcomeEmailTemplate = ({ name, loginUrl }) => {
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Chào mừng đến với EatEase</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:30px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#d4a574,#e8d5c4);padding:36px 40px;text-align:center;">
                            <h1 style="margin:0;font-size:28px;color:#fff;letter-spacing:1px;">🍽️ EatEase Restaurant</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:36px 40px;">
                            <h2 style="color:#333;margin-top:0;">Chào mừng bạn, ${name}! 🎉</h2>
                            <p style="color:#555;line-height:1.7;font-size:15px;">
                                Tài khoản của bạn đã được tạo thành công thông qua <strong>Google</strong>.
                                Bạn có thể bắt đầu khám phá thực đơn, đặt bàn và nhiều tính năng thú vị khác ngay bây giờ.
                            </p>
                            <p style="color:#555;line-height:1.7;font-size:15px;">
                                Với EatEase, bạn có thể:
                            </p>
                            <ul style="color:#555;line-height:2;font-size:15px;padding-left:20px;">
                                <li>📋 Đặt bàn trực tuyến nhanh chóng</li>
                                <li>🛒 Đặt món trước khi đến nhà hàng</li>
                                <li>📦 Theo dõi đơn hàng theo thời gian thực</li>
                                <li>🎁 Nhận ưu đãi và voucher dành riêng cho thành viên</li>
                            </ul>
                            <div style="text-align:center;margin:32px 0;">
                                <a href="${loginUrl}"
                                   style="display:inline-block;background:linear-gradient(135deg,#d4a574,#c08c5a);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:bold;letter-spacing:0.5px;">
                                    Vào trang chủ ngay →
                                </a>
                            </div>
                            <p style="color:#888;font-size:13px;line-height:1.7;">
                                Nếu bạn không thực hiện thao tác này, vui lòng bỏ qua email này.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f9f6f2;padding:20px 40px;text-align:center;border-top:1px solid #f0e6d8;">
                            <p style="margin:0;color:#aaa;font-size:12px;">
                                © 2025 EatEase Restaurant · Hệ thống nhà hàng thông minh
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
};

export default welcomeEmailTemplate;
