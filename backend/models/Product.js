import mongoose from "mongoose";
import cloudinary from "cloudinary";

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    description: String,
    price: { type: Number, required: true },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    stock: { type: Number, default: 0 },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    mainImage: { type: String, required: true },
    additionalImages: [String],
    ratings: { type: Number, default: 0 },
    details: { type: String, default: "" }, // Thông tin chi tiết
  },
  { timestamps: true }
);

// Phương thức để tải lên hình ảnh lên Cloudinary
productSchema.methods.uploadImage = async function (imagePath) {
  try {
    const result = await cloudinary.v2.uploader.upload(imagePath);
    return result.secure_url;
  } catch (error) {
    throw new Error("Failed to upload image to Cloudinary");
  }
};

export default mongoose.model("Product", productSchema);
