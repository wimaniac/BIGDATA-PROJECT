import express from "express";
import Inventory from "../models/Inventory.js";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware kiểm tra token
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không có token được cung cấp!" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ!" });
  }
};

// Middleware chỉ cho phép manager hoặc admin
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
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ!" });
  }
};

// Get all inventory items (yêu cầu đăng nhập)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const inventoryItems = await Inventory.find();
    res.json(inventoryItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get inventory item by ID (yêu cầu đăng nhập)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const inventoryItem = await Inventory.findById(req.params.id);
    if (!inventoryItem)
      return res.status(404).json({ message: "Inventory item not found" });
    res.json(inventoryItem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get inventory items by category (yêu cầu đăng nhập)
router.get("/category/:categoryId", authMiddleware, async (req, res) => {
  try {
    const inventoryItems = await Inventory.find({
      category: req.params.categoryId,
    });
    res.json(inventoryItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Thêm mới tồn kho (chỉ manager hoặc admin)
router.post("/", authAdminOrManager, async (req, res) => {
  const { product, quantity, price, category, warehouse } = req.body;

  if (!product || !quantity || !warehouse) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết!" });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ!" });
    }

    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại!" });
    }

    const existingInventory = await Inventory.findOne({ product, warehouse });
    if (existingInventory) {
      return res.status(400).json({ message: "Tồn kho cho sản phẩm này tại kho đã tồn tại! Vui lòng chỉnh sửa thay vì tạo mới." });
    }

    const inventory = new Inventory({
      product,
      quantity,
      price,
      category,
      warehouse,
    });
    const newInventory = await inventory.save();

    console.log(`Đã thêm Inventory cho sản phẩm ${productDoc.name}: ${quantity}`);
    res.status(201).json(newInventory);
  } catch (err) {
    console.error("Lỗi trong POST /api/inventory:", err);
    res.status(400).json({ message: err.message });
  }
});

// Chỉnh sửa tồn kho (chỉ manager hoặc admin)
router.put("/:id", authAdminOrManager, async (req, res) => {
  const { quantity, product } = req.body;

  try {
    const inventoryItem = await Inventory.findById(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const updatedInventoryItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedInventoryItem);
  } catch (err) {
    console.error("Lỗi trong PUT /api/inventory/:id:", err);
    res.status(400).json({ message: err.message });
  }
});

// Xóa tồn kho (chỉ manager hoặc admin)
router.delete("/:id", authAdminOrManager, async (req, res) => {
  try {
    const deletedInventoryItem = await Inventory.findByIdAndDelete(req.params.id);
    if (!deletedInventoryItem)
      return res.status(404).json({ message: "Không tìm thấy mục hàng tồn kho" });
    res.json({ message: "Đã xóa mục hàng tồn kho" });
  } catch (err) {
    console.error("Lỗi trong DELETE /api/inventory/:id:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;