import express from "express";
import Category from "../models/Category.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware kiểm tra token hợp lệ (cho phép tất cả vai trò đã đăng nhập)
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

// Get all categories (Cho phép tất cả người dùng đã đăng nhập)
router.get("/", authToken, async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// API lấy danh mục cha (Cho phép tất cả người dùng đã đăng nhập)
router.get("/parents", authToken, async (req, res) => {
  try {
    const parentCategories = await Category.find({ parent: null });
    if (!parentCategories) {
      return res.status(404).json({ message: "Không có danh mục cha nào!" });
    }
    res.json(parentCategories);
  } catch (err) {
    console.error("🔥 Lỗi lấy danh mục cha:", err);
    res.status(500).json({ message: "Lỗi server!", error: err.message });
  }
});

// Get category by ID (Cho phép tất cả người dùng đã đăng nhập)
router.get("/:id", authToken, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// API lấy danh mục con theo danh mục cha (Cho phép tất cả người dùng đã đăng nhập)
router.get("/subcategories/:parentId", authToken, async (req, res) => {
  try {
    const subcategories = await Category.find({ parent: req.params.parentId });
    res.json(subcategories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new category (Chỉ admin hoặc manager)
router.post("/", authAdminOrManager, async (req, res) => {
  const category = new Category({
    name: req.body.name,
    parent: req.body.parent,
  });
  try {
    const newCategory = await category.save();
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update category (Chỉ admin hoặc manager)
router.put("/:id", authAdminOrManager, async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedCategory) return res.status(404).json({ message: "Category not found" });
    res.json(updatedCategory);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete category (Chỉ admin hoặc manager)
router.delete("/:id", authAdminOrManager, async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    if (!deletedCategory) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;