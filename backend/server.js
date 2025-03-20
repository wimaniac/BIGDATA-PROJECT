import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js"; // Import category routes
import productRoutes from "./routes/productRoutes.js"; // Import product routes
import supplierRoutes from "./routes/supplierRoutes.js";
import cron from "node-cron";
import updateBestSellers from "./jobs/updateBestSellers.js";
import runInventoryJobTracker from "./jobs/inventoryJobTracker.js";

// Chạy Job mỗi ngày lúc 00:00
cron.schedule("0 0 * * *", () => {
  console.log("⏳ Đang chạy Job cập...");
  updateBestSellers();
  runInventoryJobTracker();

});import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

dotenv.config();

// Kiểm tra biến môi trường
if (!process.env.CONNECT_STRING) {
  console.error("❌ Lỗi: Không tìm thấy biến môi trường CONNECT_STRING!");
  process.exit(1);
}

// Kết nối MongoDB với timeout & retry
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.CONNECT_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Thử kết nối tối đa 10s
    });
    console.log("✅ Kết nối MongoDB thành công!");
  } catch (error) {
    console.error("❌ Lỗi kết nối MongoDB:", error);
    process.exit(1);
  }
};

const runInventoryJobTracker = async () => {
  try {
    console.log("🔄 Đang chạy JobTracker cập nhật sản phẩm bán chạy...");

    // Kết nối MongoDB trước khi truy vấn
    await connectDB();

    // Lấy tất cả đơn hàng đã giao
    const completedOrders = await Order.find({ status: "Đã giao" });

    if (completedOrders.length === 0) {
      console.log("⚠️ Không có đơn hàng nào cần cập nhật.");
      return;
    }

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
    console.error("❌ Lỗi khi chạy JobTracker:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Chạy JobTracker
runInventoryJobTracker();


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.CONNECT_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Kết nối MongoDB thành công"))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("API Siêu thị đang chạy...");
});

app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes); 
app.use("/api/products", productRoutes); 
app.use("/api/suppliers", supplierRoutes);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
  console.log(`Chuỗi kết nối MongoDB: ${process.env.CONNECT_STRING}`);
});
