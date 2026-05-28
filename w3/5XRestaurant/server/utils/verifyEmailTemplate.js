const verifyEmailTemplate = ({ name, url }) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; border: 1px solid #e9ecef;">
                <h2 style="color: #2c3e50; margin-bottom: 20px;">Xác nhận địa chỉ email</h2>

                <p>Xin chào <strong>${name}</strong>,</p>

                <p>Cảm ơn bạn đã đăng ký tài khoản tại EatEase Restaurant. Để hoàn tất đăng ký, vui lòng xác nhận địa chỉ email của bạn bằng cách nhấn vào nút bên dưới:</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}"
                       style="background-color: #2c3e50; color: #ffffff; text-decoration: none;
                              padding: 12px 30px; border-radius: 4px; font-weight: bold;
                              display: inline-block; font-size: 16px;">
                        Xác nhận Email
                    </a>
                </div>

                <p>Nếu nút trên không hoạt động, bạn có thể sao chép và dán đường dẫn sau vào trình duyệt:</p>
                <p style="word-break: break-all; color: #6c757d; font-size: 14px;
                          background-color: #f1f3f5; padding: 10px; border-radius: 4px;">
                    ${url}
                </p>

                <p style="color: #6c757d; font-size: 14px; margin-top: 20px;">
                    Liên kết xác nhận sẽ hết hạn sau 24 giờ. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
                </p>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d;">
                    <p>Trân trọng,<br/>Đội ngũ EatEase Restaurant</p>
                    <a href="${process.env.FRONTEND_URL}"
                        target="_blank"
                        style="color:#0d6efd; text-decoration:none;">
                        🌐 eatease.com
                    </a>

                    <p>EatEase Restaurant - 123 Ẩm Thực, Quang Trung, TP.Đà Nẵng</p>
                    <p>Hotline: 1900 1234 | Email: support@eatease.com</p>
                    <p>&copy; ${new Date().getFullYear()} EatEase Restaurant. All rights reserved.</p>
                </div>
            </div>
        </div>
    `
}

export default verifyEmailTemplate