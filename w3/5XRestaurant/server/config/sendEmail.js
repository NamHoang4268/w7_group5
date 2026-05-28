import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,   // Gmail của bạn, vd: myapp@gmail.com
        pass: process.env.EMAIL_PASS,   // Gmail App Password (không phải mật khẩu Gmail thường)
    },
});

const sendEmail = async ({ sendTo, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"EatEase Restaurant" <${process.env.EMAIL_USER}>`,
            to: sendTo,
            subject: subject,
            html: html,
        });

        return info;
    } catch (error) {
        console.error('Send email error:', error);
    }
};

export default sendEmail;