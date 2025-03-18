import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["customer", "sales", "manager", "admin"],
      default: "customer",
    }, // New role field
    address: {
      street: { type: String }, // Số nhà, tên đường
      ward: { type: String }, // Phường/Xã
      district: { type: String }, // Quận/Huyện
      city: { type: String }, // Thành phố/Tỉnh
      country: { type: String, default: "Vietnam" }, // Quốc gia (mặc định Việt Nam)
    },
    phone: { type: String }, // Số điện thoại
       // Dành cho đăng nhập bằng Google OAuth
       googleId: { type: String, unique: true, sparse: true }, // Google User ID
       avatar: { type: String }, // Ảnh đại diện từ Google
       provider: { type: String, enum: ["local", "google"], default: "local" }, // Phương thức đăng nhập
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
