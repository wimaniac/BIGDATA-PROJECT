import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import cron from "node-cron";
import updateBestSellers from "./jobs/updateBestSellers.js";
import runInventoryJobTracker from "./jobs/inventoryJobTracker.js";
import cartRoutes from "./routes/cartRoutes.js";

dotenv.config();

if (!process.env.CONNECT_STRING) {
  console.error("❌ Lỗi: Không tìm thấy biến môi trường CONNECT_STRING!");
  process.exit(1);
}

// ✅ Chỉ gọi `mongoose.connect()` một lần
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.CONNECT_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ Kết nối MongoDB thành công!");

    // ✅ Chạy JobTracker sau khi MongoDB kết nối thành công
    cron.schedule("0 0 * * *", async () => {
      console.log("⏳ Đang chạy JobTracker...");
      try {
        await updateBestSellers();
        await runInventoryJobTracker();
        console.log("✅ JobTracker chạy thành công!");
      } catch (error) {
        console.error("❌ Lỗi khi chạy JobTracker:", error);
      }
    });

    // ✅ Chạy server sau khi kết nối thành công
    startServer();
  } catch (error) {
    console.error("❌ Lỗi kết nối MongoDB:", error);
    process.exit(1);
  }
};

const startServer = () => {
  const app = express();
  app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  app.use(express.json()); // ✅ Quan trọng: Đảm bảo server hỗ trợ JSON
  app.get("/", (req, res) => {
    res.send("API Siêu thị đang chạy...");
  });

  app.use("/api/users", userRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/suppliers", supplierRoutes);
  app.use("/api/carts", cartRoutes);
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Máy chủ đang chạy trên cổng ${PORT}`));
};

connectDB();
