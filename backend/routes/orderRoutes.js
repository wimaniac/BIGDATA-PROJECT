import express from "express";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Payment from "../models/Payment.js"; // Thêm import Payment
import User from "../models/User.js";
const router = express.Router();
import jwt from "jsonwebtoken";

const checkRole = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không có token!" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !["sales", "manager", "admin"].includes(user.role)) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập!" });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token không hợp lệ!" });
  }
};
// Get all orders
router.get("/", checkRole, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("products.product", "name price");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Get order by ID
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("products.product", "name price");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Thêm vào orderRoutes.js
// Route lấy đơn hàng của người dùng
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Không có token!" });
  }

  try {
    // Xác thực token và kiểm tra userId
    console.log("Token nhận được:", token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key"); // Đảm bảo có JWT_SECRET
    console.log("Token decoded:", decoded);
    if (decoded.id !== userId) {
      return res.status(403).json({ message: "Không có quyền truy cập!" });
    }

    // Truy vấn đơn hàng
    const orders = await Order.find({ user: userId })
      .populate("products.product", "name price")
      .lean(); // Thêm .lean() để tăng tốc độ nếu không cần Mongoose Document
    console.log("Đơn hàng tìm thấy:", orders);

    res.json(orders);
  } catch (err) {
    console.error("Lỗi trong GET /user/:userId:", err.message); // Log chi tiết lỗi
    console.error("Stack trace:", err.stack);
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});
// Create a new order
router.post("/", async (req, res) => {
  const { user, products, totalAmount, shippingInfo, status } = req.body;

  if (!user || !products || !totalAmount) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết!" });
  }

  try {
    const order = new Order({
      user,
      products,
      totalAmount,
      shippingInfo: shippingInfo || {},
      status: status || "Đang xử lí",
    });
    const newOrder = await order.save();
    const deletedCart = await Cart.findOneAndDelete({ userId: user });
    console.log("Giỏ hàng đã xóa:", deletedCart); 
    res.status(201).json(newOrder);
  } catch (err) {
    console.error("Lỗi khi tạo đơn hàng:", err);
    res.status(400).json({ message: err.message });
  }
});
// Update order
router.put("/:id", async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedOrder)
      return res.status(404).json({ message: "Order not found" });
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete order
router.delete("/:id", async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder)
      return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;