import express from "express";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js"; // Thêm để kiểm tra order
import User from "../models/User.js"; // Thêm để kiểm tra user

const router = express.Router();

// Get all payments
router.get("/", async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("order", "total")
      .populate("user", "name email");
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get payment by ID
router.get("/:id", async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("order", "total")
      .populate("user", "name email");
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new payment
router.post("/", async (req, res) => {
  const { order, user, paymentMethod, transactionId, status } = req.body;

  if (!order || !user || !paymentMethod) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết!" });
  }

  try {
    // Kiểm tra order và user có tồn tại không
    const orderExists = await Order.findById(order);
    if (!orderExists) return res.status(404).json({ message: "Order not found" });

    const userExists = await User.findById(user);
    if (!userExists) return res.status(404).json({ message: "User not found" });

    const payment = new Payment({
      order,
      user,
      paymentMethod,
      transactionId: transactionId || null,
      status: status || "Đang xử lí",
    });
    const newPayment = await payment.save();

    res.status(201).json(newPayment);
  } catch (err) {
    console.error("Lỗi khi tạo thanh toán:", err);
    res.status(400).json({ message: err.message });
  }
});

// Update payment
router.put("/:id", async (req, res) => {
  try {
    const updatedPayment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedPayment)
      return res.status(404).json({ message: "Payment not found" });
    res.json(updatedPayment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete payment
router.delete("/:id", async (req, res) => {
  try {
    const deletedPayment = await Payment.findByIdAndDelete(req.params.id);
    if (!deletedPayment)
      return res.status(404).json({ message: "Payment not found" });
    res.json({ message: "Payment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.delete("/remove", async (req, res) => {
  const { userId } = req.body;
  try {
    const cart = await Cart.findOneAndDelete({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    res.json({ message: "Cart removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
export default router;