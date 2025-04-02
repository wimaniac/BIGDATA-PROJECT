import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paymentMethod: String,
    transactionId: String,
    status: { 
        type: String, 
        enum: ["Đã thanh toán","Chưa thanh toán", "Đang xử lí", "Đã hủy"], 
        default: "Đang xử lí" 
    },
}, { timestamps: true });

export default mongoose.model("Payment", paymentSchema);