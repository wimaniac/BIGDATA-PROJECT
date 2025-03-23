import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

dotenv.config();

if (!process.env.CONNECT_STRING) {
  console.error("❌ Lỗi: CONNECT_STRING không được tìm thấy!");
  process.exit(1);
}

const updateBestSellers = async () => {
  try {
    console.log("🔄 Đang cập nhật số lượng sản phẩm bán chạy...");
    const completedOrders = await Order.find({ status: "Đã giao" });

    const salesMap = new Map();
    completedOrders.forEach((order) => {
      order.products.forEach((item) => {
        const productId = item.product.toString();
        salesMap.set(productId, (salesMap.get(productId) || 0) + item.quantity);
      });
    });

    for (const [productId, totalSold] of salesMap) {
      await Product.findByIdAndUpdate(productId, { totalSold });
    }

    console.log("✅ Cập nhật sản phẩm bán chạy thành công!");
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật sản phẩm bán chạy:", error);
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
    await updateBestSellers();
  } catch (error) {
    console.error("❌ Lỗi khi chạy JobTracker:", error);
  } finally {
    await mongoose.disconnect(); // Đóng kết nối sau khi job hoàn tất
    console.log("🔌 Đã đóng kết nối MongoDB.");
  }
};

export default runJob;
