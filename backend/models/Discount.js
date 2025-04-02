import mongoose from "mongoose";

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true, 
      uppercase: true, 
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"], 
      required: true,
    },
    discountValue: {
      type: Number,
      required: true, 
      min: 0,
    },
    minPurchase: {
      type: Number,
      default: 0, 
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: null,
      min: 0,
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category", 
      },
    ],
    startDate: {
      type: Date,
      required: true, 
    },
    endDate: {
      type: Date,
      required: true, 
    },
    isActive: {
      type: Boolean,
      default: true, 
    },
  },
  { timestamps: true }
);

// Index để tìm kiếm nhanh theo mã giảm giá và thời gian
discountSchema.index({ code: 1 });
discountSchema.index({ startDate: 1, endDate: 1, isActive: 1 });

export default mongoose.model("Discount", discountSchema);