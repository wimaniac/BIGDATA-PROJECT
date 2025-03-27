import express from "express";
import Warehouse from "../models/Warehouse.js";

const router = express.Router();

// Middleware kiểm tra vai trò (giả định đã có từ inventoryRoutes.js)
const checkRole = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không có token!" });
  }
  // Logic kiểm tra vai trò (admin/manager) ở đây nếu cần
  next();
};

// Get all warehouses
router.get("/", async (req, res) => {
  try {
    const warehouses = await Warehouse.find();
    res.json(warehouses);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// Get warehouse by ID
router.get("/:id", async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ message: "Kho không tồn tại" });
    res.json(warehouse);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// Create a new warehouse
router.post("/", checkRole, async (req, res) => {
  const { name, location, capacity } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Tên kho là bắt buộc!" });
  }

  const warehouse = new Warehouse({
    name,
    location,
    capacity: capacity ? parseInt(capacity) : undefined,
  });

  try {
    const newWarehouse = await warehouse.save();
    res.status(201).json(newWarehouse);
  } catch (err) {
    res.status(400).json({ message: "Lỗi khi tạo kho: " + err.message });
  }
});

// Update warehouse
router.put("/:id", checkRole, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ message: "Kho không tồn tại" });

    warehouse.name = req.body.name || warehouse.name;
    warehouse.location = req.body.location || warehouse.location;
    warehouse.capacity = req.body.capacity
      ? parseInt(req.body.capacity)
      : warehouse.capacity;

    const updatedWarehouse = await warehouse.save();
    res.json(updatedWarehouse);
  } catch (err) {
    res.status(400).json({ message: "Lỗi khi cập nhật kho: " + err.message });
  }
});

// Delete warehouse
router.delete("/:id", checkRole, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) return res.status(404).json({ message: "Kho không tồn tại" });

    // Kiểm tra xem kho có đang được sử dụng trong Inventory không
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