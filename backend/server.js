import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import discountRoutes from "./routes/discountRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import warehouseRoutes from "./routes/warehouseRoutes.js";
dotenv.config();

if (!process.env.CONNECT_STRING) {
  console.error("❌ Lỗi: Không tìm thấy biến môi trường CONNECT_STRING!");
  process.exit(1);
}

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false); // ✅ Ngăn cảnh báo strictQuery
    await mongoose.connect(process.env.CONNECT_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });

    console.log("✅ Kết nối MongoDB thành công!");
    
    if (typeof startServer === "function") {
      startServer(); // ✅ Chạy server sau khi kết nối
    } else {
      console.error("❌ Lỗi: Hàm startServer chưa được định nghĩa.");
    }
  } catch (error) {
    console.error("❌ Lỗi kết nối MongoDB:", error.message);
    process.exit(1);
  }
};

const startServer = () => {
  const app = express();
  app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  }));
  app.use(express.json()); // Đảm bảo server hỗ trợ JSON
  app.get("/", (req, res) => {
    res.send("API Siêu thị đang chạy...");
  });

  app.use("/api/users", userRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/suppliers", supplierRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/discounts", discountRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/warehouses", warehouseRoutes);
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Máy chủ đang chạy trên cổng ${PORT}`));
  console.log("JWT_SECRET:", process.env.JWT_SECRET);
};

connectDB();
