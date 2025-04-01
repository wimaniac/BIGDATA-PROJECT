import express from "express";
import Discount from "../models/Discount.js";
import Product from "../models/Product.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Middleware kiểm tra token
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
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
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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

// Tạo giảm giá mới (chỉ manager hoặc admin)
router.post("/", authAdminOrManager, async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    minPurchase,
    maxDiscount,
    applicableProducts,
    applicableCategories,
    startDate,
    endDate,
  } = req.body;

  try {
    const existingDiscount = await Discount.findOne({ code });
    if (existingDiscount) {
      return res.status(400).json({ message: "Mã giảm giá đã tồn tại!" });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: "Ngày bắt đầu phải trước ngày kết thúc!" });
    }

    const discount = new Discount({
      code,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      startDate,
      endDate,
    });

    const savedDiscount = await discount.save();
    res.status(201).json(savedDiscount);
  } catch (error) {
    console.error("Lỗi khi tạo giảm giá:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});

// Lấy tất cả giảm giá (yêu cầu đăng nhập)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const discounts = await Discount.find()
      .populate("applicableProducts", "name price")
      .populate("applicableCategories", "name");
    res.json(discounts);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách giảm giá:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});

// Lấy giảm giá theo ID (yêu cầu đăng nhập)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id)
      .populate("applicableProducts", "name price")
      .populate("applicableCategories", "name");
    if (!discount) return res.status(404).json({ message: "Không tìm thấy giảm giá!" });
    res.json(discount);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});

// Cập nhật giảm giá (chỉ manager hoặc admin)
router.put("/:id", authAdminOrManager, async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ message: "Không tìm thấy giảm giá!" });

    discount.code = req.body.code || discount.code;
    discount.description = req.body.description || discount.description;
    discount.discountType = req.body.discountType || discount.discountType;
    discount.discountValue = req.body.discountValue || discount.discountValue;
    discount.minPurchase = req.body.minPurchase || discount.minPurchase;
    discount.maxDiscount = req.body.maxDiscount || discount.maxDiscount;
    discount.applicableProducts = req.body.applicableProducts || discount.applicableProducts;
    discount.applicableCategories = req.body.applicableCategories || discount.applicableCategories;
    discount.startDate = req.body.startDate || discount.startDate;
    discount.endDate = req.body.endDate || discount.endDate;
    discount.isActive = req.body.isActive !== undefined ? req.body.isActive : discount.isActive;

    const updatedDiscount = await discount.save();
    res.json(updatedDiscount);
  } catch (error) {
    console.error("Lỗi khi cập nhật giảm giá:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});

// Xóa giảm giá (chỉ manager hoặc admin)
router.delete("/:id", authAdminOrManager, async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) return res.status(404).json({ message: "Không tìm thấy giảm giá!" });
    res.json({ message: "Đã xóa giảm giá!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});

// Lấy giá sản phẩm sau khi áp dụng giảm giá (yêu cầu đăng nhập)
router.get("/apply/:productId", authMiddleware, async (req, res) => {
  const { productId } = req.params;
  const currentDate = new Date();

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });

    const discounts = await Discount.find({
      $or: [
        { applicableProducts: productId },
        { applicableCategories: { $in: [product.parentCategory, product.subCategory] } },
        { applicableProducts: { $size: 0 }, applicableCategories: { $size: 0 } },
      ],
      isActive: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    });

    if (discounts.length === 0) {
      return res.json({
        originalPrice: product.price,
        discountedPrice: product.price,
        isDiscounted: false,
      });
    }

    let bestDiscountedPrice = product.price;
    discounts.forEach((discount) => {
      let discountedPrice;
      if (discount.discountType === "percentage") {
        discountedPrice = product.price * (1 - discount.discountValue / 100);
        if (discount.maxDiscount && discountedPrice < product.price - discount.maxDiscount) {
          discountedPrice = product.price - discount.maxDiscount;
        }
      } else {
        discountedPrice = product.price - discount.discountValue;
      }
      if (discountedPrice < bestDiscountedPrice) {
        bestDiscountedPrice = discountedPrice;
      }
    });

    res.json({
      originalPrice: product.price,
      discountedPrice: Math.max(0, bestDiscountedPrice),
      isDiscounted: true,
    });
  } catch (error) {
    console.error("Lỗi khi áp dụng giảm giá:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});

export default router;