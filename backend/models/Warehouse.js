import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String },
  capacity: { type: Number },
});

const Warehouse = mongoose.model("Warehouse", warehouseSchema);
export default Warehouse;