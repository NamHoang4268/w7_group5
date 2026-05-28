import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            default: "",
        },
        phone: {
            type: String,
            trim: true,
            unique: true,
            sparse: true, // cho phép null/undefined không bị unique conflict
        },
        totalPoints: {
            type: Number,
            default: 0,
        },
        visitCount: {
            type: Number,
            default: 0,
        },
        lastVisit: {
            type: Date,
            default: Date.now,
        },
        orders: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "TableOrder",
            },
        ],
    },
    {
        timestamps: true,
    }
);

const CustomerModel = mongoose.model("Customer", customerSchema);
export default CustomerModel;
