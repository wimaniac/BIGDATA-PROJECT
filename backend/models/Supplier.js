import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // Tên nhà cung cấp
    contactPerson: String, // Người liên hệ
    phone: String, // Số điện thoại
    email: { type: String, unique: true }, // Email
    address: String, // Địa chỉ
}, { timestamps: true });

export default mongoose.model("Supplier", supplierSchema);
