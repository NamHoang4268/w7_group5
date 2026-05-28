import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// Khởi tạo S3 Client
// Quyền sẽ tự động được lấy từ Fargate Task Role, không cần access key trong code.
const s3Client = new S3Client({ region: process.env.AWS_REGION || "ap-southeast-1" });

const uploadImageS3 = async (image) => {
    try {
        const buffer = image?.buffer || Buffer.from(await image.arrayBuffer());
        
        // Tạo unique filename
        const originalName = image?.originalname || "image.jpg";
        const extension = originalName.split('.').pop() || 'jpg';
        const fileName = `eat_ease_restaurant/${uuidv4()}.${extension}`;
        
        const bucketName = process.env.S3_BUCKET;
        if (!bucketName) {
            throw new Error("S3_BUCKET environment variable is not defined");
        }

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: buffer,
            ContentType: image?.mimetype || "image/jpeg"
        });

        await s3Client.send(command);

        // Trả về public URL thông qua CloudFront CDN
        const cdnBase = process.env.CDN_BASE_URL;
        let url;
        if (cdnBase) {
            url = `${cdnBase}/${fileName}`;
        } else {
            // Fallback (cho local dev)
            const region = process.env.AWS_REGION || "ap-southeast-1";
            url = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
        }

        return {
            success: true,
            data: {
                url: url
            }
        };
    } catch (error) {
        console.error('S3 upload error:', error);
        return {
            success: false,
            error: error.message || "Lỗi khi tải ảnh lên S3"
        };
    }
}

export default uploadImageS3;
