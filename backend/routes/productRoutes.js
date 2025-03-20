import express from "express";
import Product from "../models/Product.js";
import cloudinary from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

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


// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find()
      .populate("parentCategory", "name")  // Lấy tên danh mục chính
      .populate("subCategory", "name")     // Lấy tên danh mục phụ
      .populate("supplier", "name");       // Lấy tên nhà cung cấp
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Get product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new product with file uploads
router.post("/", upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "additionalImages", maxCount: 5 }
]), async (req, res) => {
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
      additionalImageUrls = req.files.additionalImages.map(file => file.path);
    }

    // Tạo sản phẩm mới
    const product = new Product({
      name: req.body.name,
      price: parseFloat(req.body.price),
      parentCategory: req.body.parentCategory,
      subCategory: req.body.subCategory || null,
      supplier: req.body.supplier, // Ensure supplier is included
      stock: parseInt(req.body.stock) || 0,
      unit: req.body.unit,
      details: req.body.details || "",
      description: req.body.description || "", // Add description
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
});

// Update product
router.put("/:id", upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "additionalImages", maxCount: 5 }
]), async (req, res) => {
  try {
    console.log("📩 Dữ liệu nhận từ frontend:", req.body);
    console.log("📸 Ảnh nhận được:", req.files);

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    // Cập nhật thông tin sản phẩm
    product.name = req.body.name || product.name;
    product.price = parseFloat(req.body.price) || product.price;
    product.parentCategory = req.body.parentCategory || product.parentCategory;
    product.subCategory = req.body.subCategory || product.subCategory;
    product.supplier = req.body.supplier || product.supplier;
    product.stock = parseInt(req.body.stock) || product.stock;
    product.unit = req.body.unit || product.unit;
    product.details = req.body.details || product.details;
    product.description = req.body.description || product.description;
    product.isFeature = req.body.isFeature === "true";

    // Cập nhật ảnh chính nếu có ảnh mới
    if (req.files.mainImage) {
      product.mainImage = req.files.mainImage[0].path;
    }

    // Cập nhật ảnh phụ nếu có ảnh mới
    if (req.files.additionalImages) {
      product.additionalImages = req.files.additionalImages.map(file => file.path);
    }

    // Lưu vào database
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật sản phẩm:", err);
    res.status(400).json({ message: err.message });
  }
});

// Update product description
router.patch("/:id/description", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.description = req.body.description;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete product
router.delete("/:id", async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct)
      return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;