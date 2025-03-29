import express from "express";
import RevenueReport from "../models/RevenueReport.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware kiểm tra vai trò
const checkRole = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Không có token hoặc định dạng không đúng (Bearer <token>)!" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token decoded:", decoded); 
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Lỗi xác thực token:", err.message);
    return res.status(401).json({ message: `Token không hợp lệ hoặc đã hết hạn: ${err.message}` });
  }
};


// Lấy báo cáo doanh thu theo danh mục
router.get("/category", checkRole, async (req, res) => {
  try {
    const report = await RevenueReport.findOne({ type: "category" }).sort({ createdAt: -1 });
    if (!report || !report.data) {
      return res.json([]); // Trả về mảng rỗng nếu không có dữ liệu
    }
    res.json(report.data);
  } catch (err) {
    console.error("Lỗi khi lấy báo cáo theo danh mục:", err);
    res.status(500).json({ message: "Lỗi server khi lấy báo cáo theo danh mục" });
  }
});

// Lấy báo cáo doanh thu theo thời gian
router.get("/time", checkRole, async (req, res) => {
  try {
    const { period } = req.query;
    if (!["day", "month", "year"].includes(period)) {
      return res.status(400).json({ message: "Period phải là 'day', 'month' hoặc 'year'" });
    }
    const report = await RevenueReport.findOne({ type: "time", period }).sort({ createdAt: -1 });
    if (!report || !report.data) {
      return res.json([]); // Trả về mảng rỗng nếu không có dữ liệu
    }
    res.json(report.data);
  } catch (err) {
    console.error("Lỗi khi lấy báo cáo theo thời gian:", err);
    res.status(500).json({ message: "Lỗi server khi lấy báo cáo theo thời gian" });
  }
});
export default router;