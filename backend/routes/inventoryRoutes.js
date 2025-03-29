import express from "express";
import Inventory from "../models/Inventory.js";
import mongoose from "mongoose";
import Product from "../models/Product.js";

const router = express.Router();

// Get all inventory items
router.get("/", async (req, res) => {
  try {
    const inventoryItems = await Inventory.find();
    res.json(inventoryItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get inventory item by ID
router.get("/:id", async (req, res) => {
  try {
    const inventoryItem = await Inventory.findById(req.params.id);
    if (!inventoryItem)
      return res.status(404).json({ message: "Inventory item not found" });
    res.json(inventoryItem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get inventory items by category
router.get("/category/:categoryId", async (req, res) => {
  try {
    const inventoryItems = await Inventory.find({
      category: req.params.categoryId,
    });
    res.json(inventoryItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Thêm mới tồn kho (POST)
router.post("/", async (req, res) => {
  console.log("Dữ liệu nhận được từ frontend:", req.body);
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

// Chỉnh sửa tồn kho (PUT) - Không đồng bộ stock
router.put("/:id", async (req, res) => {
  console.log("Dữ liệu nhận được từ frontend:", req.body);
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

// Xóa tồn kho (DELETE) - Không đồng bộ stock
router.delete("/:id", async (req, res) => {
  try {
    const deletedInventoryItem = await Inventory.findByIdAndDelete(req.params.id);
    if (!deletedInventoryItem)
      return res.status(404).json({ message: "Inventory item not found" });
    res.json({ message: "Inventory item deleted" });
  } catch (err) {
    console.error("Lỗi trong DELETE /api/inventory/:id:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;