import express from "express";
import Category from "../models/Category.js";

const router = express.Router();

// Get all categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// API lấy danh mục cha (parent = null)
router.get("/parents", async (req, res) => {
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

// Get category by ID
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// API lấy danh mục con theo danh mục cha
router.get("/subcategories/:parentId", async (req, res) => {
  try {
    const subcategories = await Category.find({ parent: req.params.parentId });
    res.json(subcategories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new category
router.post("/", async (req, res) => {
  const category = new Category({
    name: req.body.name,
    parent: req.body.parent, // Ensure correct parent assignment
  });
  try {
    const newCategory = await category.save();
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update category
router.put("/:id", async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedCategory)
      return res.status(404).json({ message: "Category not found" });
    res.json(updatedCategory);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete category
router.delete("/:id", async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    if (!deletedCategory)
      return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
