import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TableOrderModel from '../models/tableOrder.model.js';
import UserModel from '../models/user.model.js';

dotenv.config();

async function connectDB() {
    const mongoUrl = process.env.MONGODB_URL || process.env.MONGODB_URI;
    if (!mongoUrl) {
        throw new Error('MONGODB_URL or MONGODB_URI not found in environment variables');
    }
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');
}

async function migrate() {
    try {
        await connectDB();
        console.log('🔄 Starting migration from v1 to v2...\n');
        
        // Migrate TableOrders
        console.log('📋 Migrating TableOrders...');
        const tableOrderResult = await TableOrderModel.updateMany(
            { paidAt: { $exists: true, $ne: null } },
            { $set: { overallStatus: 'completed' } }
        );
        console.log(`   ✅ Updated ${tableOrderResult.modifiedCount} completed orders`);

        const tableOrderResult2 = await TableOrderModel.updateMany(
            { status: 'active', overallStatus: { $exists: false } },
            { $set: { overallStatus: 'ordering' } }
        );
        console.log(`   ✅ Updated ${tableOrderResult2.modifiedCount} active orders`);

        // Set day of week and time slot
        const allTableOrders = await TableOrderModel.find({});
        for (let order of allTableOrders) {
            const dayOfWeek = new Date(order.createdAt).getDay();
            const hour = new Date(order.createdAt).getHours();
            let timeSlot = 'other';
            
            if (hour >= 6 && hour < 11) timeSlot = 'breakfast';
            else if (hour >= 11 && hour < 14) timeSlot = 'lunch';
            else if (hour >= 17 && hour < 21) timeSlot = 'dinner';
            
            await TableOrderModel.findByIdAndUpdate(order._id, {
                $set: {
                    dayOfWeek,
                    timeSlot,
                    peakHour: hour >= 12 && hour <= 13 || hour >= 19 && hour <= 20
                }
            });
        }
        console.log(`   ✅ Set dayOfWeek, timeSlot, and peakHour for all orders`);

        // Migrate Users  
        console.log('\n👤 Migrating Users...');
        const userResult = await UserModel.updateMany(
            { tierLevel: { $exists: false } },
            { 
                $set: { 
                    tierLevel: 'bronze',
                    nextTierThreshold: 1000,
                    nextTierProgress: 0
                } 
            }
        );
        console.log(`   ✅ Updated ${userResult.modifiedCount} users with tier system`);

        // Calculate tier progress for users with rewards points
        const allUsers = await UserModel.find({});
        for (let user of allUsers) {
            if (user.rewardsPoint && user.nextTierThreshold) {
                const progress = Math.min((user.rewardsPoint / user.nextTierThreshold) * 100, 100);
                
                // Determine tier based on points
                let tierLevel = 'bronze';
                if (user.rewardsPoint >= 5000) tierLevel = 'platinum';
                else if (user.rewardsPoint >= 3000) tierLevel = 'gold';
                else if (user.rewardsPoint >= 1000) tierLevel = 'silver';
                
                await UserModel.findByIdAndUpdate(user._id, {
                    $set: {
                        tierLevel,
                        nextTierProgress: progress
                    }
                });
            }
        }
        console.log(`   ✅ Updated tier levels and progress for all users`);

        // Verify migration
        console.log('\n✔️ Verifying migration...');
        const tableOrdersWithoutStatus = await TableOrderModel.countDocuments({
            overallStatus: { $exists: false }
        });
        const usersWithoutTier = await UserModel.countDocuments({
            tierLevel: { $exists: false }
        });

        console.log(`   📊 TableOrders without overallStatus: ${tableOrdersWithoutStatus}`);
        console.log(`   📊 Users without tierLevel: ${usersWithoutTier}`);

        if (tableOrdersWithoutStatus === 0 && usersWithoutTier === 0) {
            console.log('\n✅ All migrations completed successfully!');
            console.log('📈 Migration Summary:');
            console.log(`   - TableOrders updated: ${tableOrderResult.modifiedCount + tableOrderResult2.modifiedCount}`);
            console.log(`   - Users updated: ${userResult.modifiedCount}`);
            console.log(`   - Fields added: dayOfWeek, timeSlot, peakHour, tierLevel, nextTierProgress`);
        } else {
            console.warn('⚠️ Some documents may still be missing updated fields');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
