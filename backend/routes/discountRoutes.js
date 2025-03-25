import express from "express";
import Discount from "../models/Discount.js";
import Product from "../models/Product.js";

const router = express.Router();

// // Middleware kiểm tra quyền admin (nếu cần)
// const checkAdmin = async (req, res, next) => {
//   // Giả sử bạn có logic kiểm tra token và role ở đây
//   // Ví dụ: chỉ admin mới tạo/cập nhật/xóa discount
//   next();
// };

// Tạo giảm giá mới
router.post("/", async (req, res) => {
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
    // Kiểm tra mã giảm giá đã tồn tại chưa
    const existingDiscount = await Discount.findOne({ code });
    if (existingDiscount) {
      return res.status(400).json({ message: "Mã giảm giá đã tồn tại!" });
    }

    // Kiểm tra thời gian hợp lệ
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

// Lấy tất cả giảm giá
router.get("/", async (req, res) => {
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

// Lấy giảm giá theo ID
router.get("/:id", async (req, res) => {
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

// Cập nhật giảm giá
router.put("/:id", async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ message: "Không tìm thấy giảm giá!" });

    // Cập nhật các trường
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

// Xóa giảm giá
router.delete("/:id", async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) return res.status(404).json({ message: "Không tìm thấy giảm giá!" });
    res.json({ message: "Đã xóa giảm giá!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});

// Lấy giá sản phẩm sau khi áp dụng giảm giá
router.get("/apply/:productId", async (req, res) => {
  const { productId } = req.params;
  const currentDate = new Date();

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });

    // Tìm giảm giá áp dụng cho sản phẩm hoặc danh mục của nó
    const discounts = await Discount.find({
      $or: [
        { applicableProducts: productId },
        { applicableCategories: { $in: [product.parentCategory, product.subCategory] } },
        { applicableProducts: { $size: 0 }, applicableCategories: { $size: 0 } }, // Áp dụng toàn bộ nếu không chỉ định
      ],
      isActive: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    });

    if (discounts.length === 0) {
      return res.json({ originalPrice: product.price, discountedPrice: product.price });
    }

    // Chọn giảm giá tốt nhất (ưu tiên giảm giá cao nhất)
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
      discountedPrice: Math.max(0, bestDiscountedPrice), // Đảm bảo giá không âm
    });
  } catch (error) {
    console.error("Lỗi khi áp dụng giảm giá:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
});

export default router;