import mongoose from "mongoose";

const RevenueReportSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["category", "time"], 
  },
  period: {
    type: String,
    enum: ["day", "month", "year", null], 
  },
  data: {
    type: mongoose.Mixed, 
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now, 
  },
});

// Index để tối ưu truy vấn
RevenueReportSchema.index({ type: 1, period: 1, createdAt: -1 });

export default mongoose.model("RevenueReport", RevenueReportSchema);