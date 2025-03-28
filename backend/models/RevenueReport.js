import mongoose from "mongoose";

const RevenueReportSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["category", "time"], // Loại báo cáo: theo danh mục hoặc thời gian
  },
  period: {
    type: String,
    enum: ["day", "month", "year", null], // Chỉ áp dụng cho type = "time"
    default: null,
  },
  data: {
    type: mongoose.Mixed, // Lưu dữ liệu linh hoạt (array hoặc object)
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now, // Thời gian tạo báo cáo
  },
});

// Index để tối ưu truy vấn
RevenueReportSchema.index({ type: 1, period: 1, createdAt: -1 });

export default mongoose.model("RevenueReport", RevenueReportSchema);