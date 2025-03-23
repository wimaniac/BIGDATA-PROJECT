import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";

dotenv.config();

if (!process.env.CONNECT_STRING) {
  console.error("❌ Lỗi: CONNECT_STRING không được tìm thấy!");
  process.exit(1);
}

const runInventoryJobTracker = async () => {
  try {
    console.log("🔄 Đang chạy JobTracker cập nhật tồn kho...");
    
    const orderMap = await orderInventoryMapper();
    const productMap = await productInfoMapper();
    const inventoryMap = await inventoryStatusMapper();

    await inventoryUpdateReducer(orderMap, productMap, inventoryMap);

    console.log("✅ JobTracker cập nhật tồn kho hoàn thành!");
  } catch (error) {
    console.error("❌ Lỗi khi chạy JobTracker:", error);
  }
};

// Kết nối MongoDB và chạy Job
const runJob = async () => {
  try {
    await mongoose.connect(process.env.CONNECT_STRING, {
      useNewUrlParser: true,
      serverSelectionTimeoutMS: 10000, // Tăng thời gian chờ
    });

    console.log("✅ Kết nối MongoDB thành công!");
    await runInventoryJobTracker();
  } catch (error) {
    console.error("❌ Lỗi khi chạy JobTracker:", error);
  } finally {
    await mongoose.disconnect(); // Đóng kết nối sau khi job hoàn tất
    console.log("🔌 Đã đóng kết nối MongoDB.");
  }
};

export default runJob;

