import express from "express";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Payment from "../models/Payment.js"; // Thêm import Payment

const router = express.Router();

// Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().populate("items.productId", "name price");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get order by ID
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "items.productId",
      "name price"
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
      shippingInfo: shippingInfo || {}, // Nếu không gửi shippingInfo, để mặc định là object rỗng
      status: status || "Đang xử lí",
    });
    const newOrder = await order.save();

    await Cart.findOneAndDelete({ userId: user }); // Sửa userId thành user để khớp
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