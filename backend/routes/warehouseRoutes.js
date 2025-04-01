import express from "express";
import mongoose from "mongoose";
import Warehouse from "../models/Warehouse.js";
import Inventory from "../models/Inventory.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware kiểm tra token
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không có token!" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ!" });
  }
};

// Middleware chỉ cho phép admin
const authAdminOnly = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không có token!" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này!" });
    }
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ!" });
  }
};

// Lấy danh sách tất cả kho (yêu cầu đăng nhập)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const warehouses = await Warehouse.find().lean();
    res.json(warehouses);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// Lấy thông tin kho theo ID (yêu cầu đăng nhập)
router.get("/:id", authMiddleware, async (req, res) => {
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

// Tạo kho mới (chỉ admin)
router.post("/", authAdminOnly, async (req, res) => {
  const { name, location, capacity } = req.body;

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

// Cập nhật thông tin kho (chỉ admin)
router.put("/:id", authAdminOnly, async (req, res) => {
  const { name, location, capacity } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID không hợp lệ!" });
    }

    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ message: "Kho không tồn tại" });

    warehouse.name = name || warehouse.name;
    warehouse.location = location || warehouse.location;
    warehouse.capacity = capacity ? parseInt(capacity) : warehouse.capacity;

    const updatedWarehouse = await warehouse.save();
    res.json(updatedWarehouse);
  } catch (err) {
    res.status(400).json({ message: "Lỗi khi cập nhật kho: " + err.message });
  }
});

// Xóa kho (chỉ admin)
router.delete("/:id", authAdminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID không hợp lệ!" });
    }

    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ message: "Kho không tồn tại" });

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