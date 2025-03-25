import express from "express";
import Order from "../models/Order.js";

const router = express.Router();

// Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get order by ID
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new order
router.post("/", async (req, res) => {
  const { userId, items, total, status } = req.body;

  if (!userId || !items || !total) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết để tạo đơn hàng!" });
  }

  try {
    const order = new Order({
      userId,
      items,
      total,
      status: status || "pending",
      createdAt: new Date(),
    });
    const newOrder = await order.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update order
router.put("/:id", async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// Delete order
router.delete("/:id", async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.json({ message: "Đã xóa đơn hàng" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
