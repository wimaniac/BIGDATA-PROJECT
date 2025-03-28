import express from "express";
import mongoose from "mongoose";
import Warehouse from "../models/Warehouse.js";
import Inventory from "../models/Inventory.js"; // Kiểm tra kho có chứa hàng không

const router = express.Router();

// Middleware kiểm tra vai trò (chỉ cho phép admin/manager thực hiện thay đổi)
const checkRole = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không có token!" });
  }
  // Logic kiểm tra role (giả định bạn có hệ thống auth)
  next();
};

// 🏢 **Lấy danh sách tất cả kho**
router.get("/", async (req, res) => {
  try {
    const warehouses = await Warehouse.find().lean();
    res.json(warehouses);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// 📍 **Lấy thông tin kho theo ID**
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID không hợp lệ!" });
    }
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ message: "Kho không tồn tại" });
    res.json(warehouse);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// 📦 **Tạo kho mới**
router.post("/", checkRole, async (req, res) => {
  const { name, location, capacity } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!name || !location?.city) {
    return res.status(400).json({ message: "Tên kho và thành phố là bắt buộc!" });
  }
  if (capacity && isNaN(capacity)) {
    return res.status(400).json({ message: "Dung lượng phải là số!" });
  }

  try {
    const warehouse = new Warehouse({
      name,
      location,
      capacity: capacity ? parseInt(capacity) : undefined,
    });

    const newWarehouse = await warehouse.save();
    res.status(201).json(newWarehouse);
  } catch (err) {
    res.status(400).json({ message: "Lỗi khi tạo kho: " + err.message });
  }
});

// 📝 **Cập nhật thông tin kho**
router.put("/:id", checkRole, async (req, res) => {
  const { name, location, capacity } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID không hợp lệ!" });
    }

    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ message: "Kho không tồn tại" });

    // Cập nhật thông tin nếu có
    warehouse.name = name || warehouse.name;
    warehouse.location = location || warehouse.location;
    warehouse.capacity = capacity ? parseInt(capacity) : warehouse.capacity;

    const updatedWarehouse = await warehouse.save();
    res.json(updatedWarehouse);
  } catch (err) {
    res.status(400).json({ message: "Lỗi khi cập nhật kho: " + err.message });
  }
});

// ❌ **Xóa kho**
router.delete("/:id", checkRole, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID không hợp lệ!" });
    }

    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ message: "Kho không tồn tại" });

    // Kiểm tra kho có đang chứa hàng không
    const inventoryInUse = await Inventory.findOne({ warehouse: req.params.id });
    if (inventoryInUse) {
      return res.status(400).json({ message: "Không thể xóa kho đang chứa hàng!" });
    }

    await Warehouse.findByIdAndDelete(req.params.id);
    res.json({ message: "Xóa kho thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

export default router;
