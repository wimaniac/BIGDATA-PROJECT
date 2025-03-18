import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paymentMethod: String,
    transactionId: String,
    status: { 
        type: String, 
        enum: ["Đã giao", "Đang giao", "Đang xử lí"], 
        default: "Đang xử lí" 
    },
}, { timestamps: true });

export default mongoose.model("Payment", paymentSchema);