import express from "express";
import Review from "../models/Review.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không token được cung cấp" });
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
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không token được cung cấp" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
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

// Get all reviews (yêu cầu đăng nhập)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("userId", "name email")
      .populate("productId", "name");
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get review by ID (yêu cầu đăng nhập)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("userId", "name email")
      .populate("productId", "name");
    if (!review) return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new review (yêu cầu đăng nhập)
router.post("/", authMiddleware, async (req, res) => {
  const { productId, rating, comment } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });
  }
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Số sao phải từ 1 đến 5!" });
  }
  if (!comment || comment.trim() === "") {
    return res.status(400).json({ message: "Nhận xét không được để trống!" });
  }

  try {
    const review = new Review({
      userId: req.userId,
      productId,
      rating,
      comment,
    });
    const newReview = await review.save();
    const populatedReview = await Review.findById(newReview._id)
      .populate("userId", "name email")
      .populate("productId", "name");
    res.status(201).json(populatedReview);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update review (yêu cầu người tạo đánh giá)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Không tìm thấy đánh giá sản phẩm" });

    if (review.userId.toString() !== req.userId) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa đánh giá này!" });
    }

    const updatedReview = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updatedReview);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete review (chỉ manager hoặc admin)
router.delete("/:id", authAdminOrManager, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID đánh giá không hợp lệ" });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá sản phẩm" });
    }

    await Review.findByIdAndDelete(req.params.id);
    return res.json({ message: "Đã xóa đánh giá sản phẩm" });
  } catch (err) {
    console.error("Error deleting review:", err);
    return res.status(500).json({ message: "Lỗi server khi xóa đánh giá", error: err.message });
  }
});

export default router;