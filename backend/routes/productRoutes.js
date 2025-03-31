import express from "express";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import cloudinary from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";
import axios from "axios";
const router = express.Router();
dotenv.config();

// Cấu hình Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình multer lưu ảnh trực tiếp lên Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    folder: "products", // Lưu vào thư mục "products" trên Cloudinary
    format: async (req, file) => "png", // Định dạng ảnh mặc định
    public_id: (req, file) => Date.now() + "-" + file.originalname, // Định danh ảnh
  },
});

const upload = multer({ storage });

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

const calculateAverageRating = async (productId) => {
  const reviews = await Review.find({ productId });
  if (reviews.length === 0) return 0;
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  return totalRating / reviews.length;
};
// Get all products
router.get("/", async (req, res) => {
  try {
    let query = Product.find()
      .populate("parentCategory", "name")
      .populate("subCategory", "name")
      .populate("supplier", "name");

    const products = await query.exec();

    const productsWithDiscountAndRating = await Promise.all(
      products.map(async (product) => {
        const discountResponse = await axios.get(
          `http://localhost:5000/api/discounts/apply/${product._id}`
        );
        const averageRating = await calculateAverageRating(product._id);
        return {
          ...product.toObject(),
          originalPrice: discountResponse.data.originalPrice,
          discountedPrice: discountResponse.data.discountedPrice,
          isDiscounted: discountResponse.data.isDiscounted,
          ratings: averageRating, 
        };
      })
    );

    res.json(productsWithDiscountAndRating);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách sản phẩm:", error);
    res.status(500).json({ message: "Lỗi server khi lấy sản phẩm!", error: error.message });
  }
});
router.get("/best-selling", async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const products = await Product.find({ popularityRank: { $gt: 0 } })
      .populate("parentCategory", "name")
      .populate("subCategory", "name")
      .populate("supplier", "name")
      .sort({ popularityRank: 1 })
      .limit(parseInt(limit));

    const productsWithDiscountAndRating = await Promise.all(
      products.map(async (product) => {
        const discountResponse = await axios.get(
          `http://localhost:5000/api/discounts/apply/${product._id}`
        );
        const averageRating = await calculateAverageRating(product._id);
        return {
          ...product.toObject(),
          originalPrice: discountResponse.data.originalPrice,
          discountedPrice: discountResponse.data.discountedPrice,
          isDiscounted: discountResponse.data.isDiscounted,
          ratings: averageRating, 
        };
      })
    );

    res.json(productsWithDiscountAndRating);
  } catch (error) {
    console.error("❌ Lỗi lấy sản phẩm bán chạy:", error);
    res.status(500).json({ message: "Lỗi server khi lấy sản phẩm bán chạy!", error: error.message });
  }
});

router.get("/newest", async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const products = await Product.find()
      .populate("parentCategory", "name")
      .populate("subCategory", "name")
      .populate("supplier", "name")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const productsWithDiscountAndRating = await Promise.all(
      products.map(async (product) => {
        const discountResponse = await axios.get(
          `http://localhost:5000/api/discounts/apply/${product._id}`
        );
        const averageRating = await calculateAverageRating(product._id);
        return {
          ...product.toObject(),
          originalPrice: discountResponse.data.originalPrice,
          discountedPrice: discountResponse.data.discountedPrice,
          isDiscounted: discountResponse.data.isDiscounted,
          ratings: averageRating, // Thêm trung bình rating
        };
      })
    );

    res.json(productsWithDiscountAndRating);
  } catch (error) {
    console.error("❌ Lỗi lấy sản phẩm mới:", error);
    res.status(500).json({ message: "Lỗi server khi lấy sản phẩm mới!", error: error.message });
  }
});
// Get product by ID with details
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("parentCategory", "name")
      .populate("subCategory", "name")
      .populate("supplier", "name");
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Gọi API áp dụng giảm giá
    const discountResponse = await axios.get(`http://localhost:5000/api/discounts/apply/${req.params.id}`);
    const { originalPrice, discountedPrice } = discountResponse.data;

    res.json({
      ...product.toObject(),
      originalPrice,
      discountedPrice,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new product with file uploads
router.post(
  "/",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      console.log("📩 Dữ liệu nhận từ frontend:", req.body);
      console.log("📸 Ảnh nhận được:", req.files);

      if (!req.files.mainImage) {
        return res.status(400).json({ message: "Ảnh chính là bắt buộc!" });
      }

      // URL ảnh chính từ Cloudinary
      const mainImageUrl = req.files.mainImage[0].path;

      // URL ảnh phụ từ Cloudinary
      let additionalImageUrls = [];
      if (req.files.additionalImages) {
        additionalImageUrls = req.files.additionalImages.map(
          (file) => file.path
        );
      }

      // Tạo sản phẩm mới
      const product = new Product({
        name: req.body.name,
        price: parseFloat(req.body.price),
        parentCategory: req.body.parentCategory,
        subCategory: req.body.subCategory || null,
        supplier: req.body.supplier, // Ensure supplier is included
        stock: parseInt(req.body.stock) || 0,
        details: req.body.details || "",
        isFeature: req.body.isFeature === "true",
        mainImage: mainImageUrl,
        additionalImages: additionalImageUrls, // Lưu ảnh phụ vào DB
      });

      const newProduct = await product.save();
      res.status(201).json(newProduct);
    } catch (err) {
      console.error("❌ Lỗi khi tạo sản phẩm:", err);
      res.status(500).json({ message: "Lỗi Server!", error: err.message });
    }
  }
);

// Update product
router.put(
  "/:id",
  authAdminOrManager,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

      product.name = req.body.name || product.name;
      product.price = parseFloat(req.body.price) || product.price;
      product.parentCategory = req.body.parentCategory || product.parentCategory;
      product.subCategory = req.body.subCategory || product.subCategory;
      product.supplier = req.body.supplier || product.supplier;
      product.details = req.body.details || product.details;
      product.isFeature = req.body.isFeature === "true";

      if (req.body.stock !== undefined) {
        return res.status(403).json({
          message: "Không thể cập nhật số lượng tồn kho thủ công!",
        });
      }

      if (req.files.mainImage) {
        product.mainImage = req.files.mainImage[0].path;
      }

      if (req.files.additionalImages) {
        const newImages = req.files.additionalImages.map((file) => file.path);
        product.additionalImages = [...(product.additionalImages || []), ...newImages];
      }

      if (req.body.removeAdditionalImages) {
        const imagesToRemove = JSON.parse(req.body.removeAdditionalImages);
        product.additionalImages = product.additionalImages.filter(
          (image) => !imagesToRemove.includes(image)
        );
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật sản phẩm:", err);
      res.status(400).json({ message: err.message });
    }
  }
);

// Delete product
router.delete("/:id", authAdminOrManager, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
