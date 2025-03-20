import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String, default: "" }, // Ensure description is included
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
    additionalImages: { type: [String], default: [] }, 
    ratings: { type: Number, default: 0 },
    details: { type: String, default: "" },
    unit: { type: String, required: true }, 
    totalSold: { type: Number, default: 0 },

  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);