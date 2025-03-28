import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    street: { type: String },
    ward: { type: String },
    district: { type: String },
    city: { type: String, required: true }, 
    country: { type: String, default: "Vietnam" },
  },
  capacity: { type: Number },
});

const Warehouse = mongoose.model("Warehouse", warehouseSchema);
export default Warehouse;