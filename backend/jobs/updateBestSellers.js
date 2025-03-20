import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

// Load biến môi trường từ .env
dotenv.config();

// Kiểm tra biến môi trường
if (!process.env.CONNECT_STRING) {
  console.error("❌ Lỗi: Biến môi trường CONNECT_STRING không được tìm thấy!");
  process.exit(1);
}

// Kết nối MongoDB
mongoose.connect(process.env.CONNECT_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ Kết nối MongoDB thành công!");
  updateBestSellers();
}).catch((err) => {
  console.error("❌ Lỗi kết nối MongoDB:", err);
  process.exit(1);
});

const updateBestSellers = async () => {
  try {
    console.log("🔄 Đang cập nhật số lượng sản phẩm bán chạy...");

    // Lấy tất cả đơn hàng đã giao
    const completedOrders = await Order.find({ status: "Đã giao" });

    // Tạo bảng tổng hợp số lượng bán
    const salesMap = new Map();

    completedOrders.forEach((order) => {
      order.products.forEach((item) => {
        const productId = item.product.toString();
        salesMap.set(productId, (salesMap.get(productId) || 0) + item.quantity);
      });
    });

    // Cập nhật totalSold của từng sản phẩm
    for (const [productId, totalSold] of salesMap) {
      await Product.findByIdAndUpdate(productId, { totalSold });
    }

    console.log("✅ Cập nhật sản phẩm bán chạy thành công!");
  } catch (error) {
    console.error("❌ Lỗi cập nhật sản phẩm bán chạy:", error);
  } finally {
    mongoose.connection.close();
  }
};
