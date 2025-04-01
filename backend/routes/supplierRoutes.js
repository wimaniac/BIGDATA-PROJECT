import express from "express";
import Supplier from "../models/Supplier.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // Giả định bạn có model User

const router = express.Router();

// Middleware kiểm tra token hợp lệ (yêu cầu đăng nhập)
const authToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không có token được cung cấp!" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ!" });
  }
};

// Middleware kiểm tra quyền admin hoặc manager
const authAdminOrManager = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không có token được cung cấp!" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }
    if (user.role !== "admin" && user.role !== "manager") {
      return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này!" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ!" });
  }
};

// Get all suppliers (yêu cầu đăng nhập)
router.get("/", authToken, async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get supplier by ID (yêu cầu đăng nhập)
router.get("/:id", authToken, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new supplier (chỉ admin hoặc manager)
router.post("/", authAdminOrManager, async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });
  }

  try {
    const newSupplier = new Supplier({ name, email, phone });
    await newSupplier.save();
    res.status(201).json(newSupplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update supplier (chỉ admin hoặc manager)
router.put("/:id", authAdminOrManager, async (req, res) => {
  try {
    const updatedSupplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedSupplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(updatedSupplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete supplier (chỉ admin hoặc manager)
router.delete("/:id", authAdminOrManager, async (req, res) => {
  try {
    const deletedSupplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!deletedSupplier) return res.status(404).json({ message: "Supplier not found" });
    res.json({ message: "Supplier deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;