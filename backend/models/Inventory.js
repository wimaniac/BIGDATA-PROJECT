// inventorySchema.js
import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true }, 
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Inventory = mongoose.model("Inventory", inventorySchema);
export default Inventory;