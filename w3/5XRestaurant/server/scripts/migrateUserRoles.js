/**
 * Migration Script: Fix invalid user roles
 * 
 * Chạy script này để cập nhật tất cả user có role cũ không hợp lệ
 * (ví dụ: GUEST, USER) sang CUSTOMER theo schema mới.
 * 
 * Cách dùng:
 *   node server/scripts/migrateUserRoles.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env từ thư mục server (cha của scripts/)
dotenv.config({ path: join(__dirname, '../.env') });

const VALID_ROLES = ["ADMIN", "WAITER", "CHEF", "CASHIER", "CUSTOMER", "TABLE"];

async function migrate() {
    try {
        const mongoUri = process.env.MONGODB_URL;
        if (!mongoUri) {
            throw new Error("Không tìm thấy MONGODB_URL trong .env");
        }

        console.log("🔗 Đang kết nối MongoDB...");
        await mongoose.connect(mongoUri);
        console.log("✅ Kết nối MongoDB thành công\n");

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Tìm tất cả user có role không hợp lệ
        const invalidRoleUsers = await usersCollection.find({
            role: { $nin: VALID_ROLES }
        }).toArray();

        if (invalidRoleUsers.length === 0) {
            console.log("✅ Không có user nào có role không hợp lệ. Không cần migration.");
            return;
        }

        console.log(`⚠️  Tìm thấy ${invalidRoleUsers.length} user có role không hợp lệ:`);
        const roleBreakdown = {};
        invalidRoleUsers.forEach(u => {
            roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1;
        });
        console.table(roleBreakdown);

        // Cập nhật tất cả về CUSTOMER
        const result = await usersCollection.updateMany(
            { role: { $nin: VALID_ROLES } },
            { $set: { role: "CUSTOMER" } }
        );

        console.log(`\n✅ Migration hoàn tất!`);
        console.log(`   → Đã cập nhật ${result.modifiedCount} user sang role CUSTOMER`);

    } catch (error) {
        console.error("❌ Lỗi migration:", error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Đã ngắt kết nối MongoDB.");
    }
}

migrate();
