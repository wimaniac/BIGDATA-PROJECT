import mongoose from "mongoose";

const discountSchema = new mongoose.Schema({
    code: { type: String, unique: true },
    percentage: { type: Number, min: 0, max: 100 },
    expiryDate: Date,
    active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Discount", discountSchema);
