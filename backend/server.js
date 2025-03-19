import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js"; // Import category routes
import productRoutes from "./routes/productRoutes.js"; // Import product routes

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
app.use("/api/categories", categoryRoutes); // Use category routes
app.use("/api/products", productRoutes); // Use product routes

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
  console.log(`Chuỗi kết nối MongoDB: ${process.env.CONNECT_STRING}`);
});
