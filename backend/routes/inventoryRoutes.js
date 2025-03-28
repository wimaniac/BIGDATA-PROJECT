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

    // Không kiểm tra Product.stock nữa
    const inventory = new Inventory({
      product,
      quantity,
      price,
      category,
      warehouse,
    });
    const newInventory = await inventory.save();

    // Ghi log để theo dõi
    console.log(`Đã thêm Inventory cho sản phẩm ${productDoc.name}: ${quantity}`);

    res.status(201).json(newInventory);
  } catch (err) {
    console.error("Lỗi trong POST /api/inventory:", err);
    res.status(400).json({ message: err.message });
  }
});

// Update inventory item
router.put("/:id", async (req, res) => {
  console.log("Dữ liệu nhận được từ frontend:", req.body);
  const { quantity, product } = req.body;

  try {
    const inventoryItem = await Inventory.findById(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const productId = product || inventoryItem.product;
    const productDoc = await Product.findById(productId);
    if (!productDoc) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại!" });
    }

    // Tính tổng hiện tại và thay đổi
    const currentInventory = await Inventory.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: "$product", total: { $sum: "$quantity" } } }
    ]);
    const currentTotal = currentInventory[0]?.total || 0;
    const diff = quantity - inventoryItem.quantity;
    const newTotal = currentTotal + diff;

    // Không chặn, chỉ cảnh báo nếu vượt
    if (newTotal > productDoc.stock) {
      console.warn(`Tổng tồn kho mới (${newTotal}) vượt quá stock ban đầu (${productDoc.stock}). Đang đồng bộ lại stock.`);
    }

    const updatedInventoryItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    // Đồng bộ Product.stock với tổng thực tế
    const totalStock = await Inventory.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: "$product", total: { $sum: "$quantity" } } }
    ]);
    const newStock = totalStock[0]?.total || 0;
    await Product.findByIdAndUpdate(productId, { stock: newStock });

    res.json(updatedInventoryItem);
  } catch (err) {
    console.error("Lỗi trong PUT /api/inventory/:id:", err);
    res.status(400).json({ message: err.message });
  }
});
// Adjust inventory item (chỉ sửa lỗi số lượng, không đồng bộ Product.stock)
router.put("/adjust/:id", async (req, res) => {
  const { quantity } = req.body;

  try {
    const inventoryItem = await Inventory.findById(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const productDoc = await Product.findById(inventoryItem.product);
    if (!productDoc) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại!" });
    }

    // Cập nhật quantity trong Inventory mà không ảnh hưởng Product.stock
    inventoryItem.quantity = quantity;
    const updatedInventoryItem = await inventoryItem.save();

    // Không đồng bộ Product.stock ở đây
    // Thay vào đó, ghi log để quản trị viên kiểm tra nếu cần
    console.log(`Đã điều chỉnh Inventory ${inventoryItem._id} từ ${inventoryItem.quantity} thành ${quantity}`);

    res.json({ message: "Đã điều chỉnh tồn kho", updatedInventoryItem });
  } catch (err) {
    console.error("Lỗi trong PUT /api/inventory/adjust/:id:", err);
    res.status(400).json({ message: err.message });
  }
});
// Delete inventory item
router.delete("/:id", async (req, res) => {
  try {
    const deletedInventoryItem = await Inventory.findByIdAndDelete(req.params.id);
    if (!deletedInventoryItem)
      return res.status(404).json({ message: "Inventory item not found" });

    // Cập nhật product.stock sau khi xóa
    const productId = deletedInventoryItem.product;
    const totalStock = await Inventory.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: "$product", total: { $sum: "$quantity" } } }
    ]);
    const newStock = totalStock[0]?.total || 0;
    await Product.findByIdAndUpdate(productId, { stock: newStock });

    res.json({ message: "Inventory item deleted" });
  } catch (err) {
    console.error("Lỗi trong DELETE /api/inventory/:id:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
