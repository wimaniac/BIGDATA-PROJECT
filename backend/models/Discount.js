import mongoose from "mongoose";

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true, // Mã giảm giá phải duy nhất
      uppercase: true, // Chuyển thành chữ in hoa
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"], // Loại giảm giá: phần trăm hoặc cố định
      required: true,
    },
    discountValue: {
      type: Number,
      required: true, // Giá trị giảm (phần trăm hoặc số tiền cố định)
      min: 0,
    },
    minPurchase: {
      type: Number,
      default: 0, // Số tiền tối thiểu để áp dụng giảm giá
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: null, // Giới hạn tối đa của giảm giá (dùng cho percentage)
      min: 0,
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", // Danh sách sản phẩm áp dụng giảm giá
      },
    ],
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category", // Danh sách danh mục áp dụng giảm giá
      },
    ],
    startDate: {
      type: Date,
      required: true, // Ngày bắt đầu áp dụng
    },
    endDate: {
      type: Date,
      required: true, // Ngày kết thúc áp dụng
    },
    isActive: {
      type: Boolean,
      default: true, // Trạng thái hoạt động
    },
  },
  { timestamps: true }
);

// Index để tìm kiếm nhanh theo mã giảm giá và thời gian
discountSchema.index({ code: 1 });
discountSchema.index({ startDate: 1, endDate: 1, isActive: 1 });

export default mongoose.model("Discount", discountSchema);