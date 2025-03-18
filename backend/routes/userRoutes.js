import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs"; // Thêm bcrypt để mã hóa mật khẩu
import validator from "validator"; // Thêm validator để kiểm tra email
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new user

// Tạo tài khoản mới (Tự động tạo admin nếu chưa có)
router.post("/", async (req, res) => {
    try {
      const { name, email, password, role, googleId, avatar } = req.body;
  
      if (!name || !email) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });
      }
  
      // Kiểm tra email hợp lệ
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Email không hợp lệ!" });
      }
  
      // Kiểm tra nếu email đã tồn tại
      let user = await User.findOne({ email });
  
      if (user) {
        // Nếu user đã tồn tại nhưng đang đăng ký bằng Google -> Cho phép đăng nhập
        if (googleId && user.googleId) {
          return res.status(200).json({ message: "Đăng nhập thành công!", user });
        }
        return res.status(400).json({ message: "Email đã được sử dụng!" });
      }
  
      // Xác định role của tài khoản đầu tiên
      const isFirstUser = (await User.countDocuments()) === 0;
      const assignedRole = isFirstUser ? "admin" : role || "customer";
  
      let hashedPassword = null;
      if (password) {
        // Kiểm tra mật khẩu có đủ mạnh không
        if (!validator.isStrongPassword(password)) {
          return res.status(400).json({ message: "Mật khẩu quá yếu! Cần ít nhất 8 ký tự, có chữ hoa, số và ký tự đặc biệt." });
        }
        hashedPassword = await bcrypt.hash(password, 10);
      }
  
      // Tạo user mới
      user = new User({
        name,
        email,
        password: hashedPassword,
        role: assignedRole,
        isAdmin: assignedRole === "admin",
        googleId: googleId || null,
        avatar: avatar || null,
        provider: googleId ? "google" : "local"
      });
  
      await user.save();
      res.status(201).json({ message: "Tạo tài khoản thành công!", user });
  
    } catch (err) {
      console.error("❌ Lỗi Server:", err);
      res.status(500).json({ message: "Lỗi server!", error: err.message });
    }
  });
  
  
  
  

// Update user
router.put("/:id", async (req, res) => {
    try {
      const { email, password, role } = req.body;
      const { id } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID không hợp lệ!" });
      }
  
      let updateData = { ...req.body };
  
      // Kiểm tra email hợp lệ
      if (email && !validator.isEmail(email)) {
        return res.status(400).json({ message: "Email không hợp lệ!" });
      }
  
      // Chỉ admin mới có quyền cập nhật role
      if (role && req.user.role !== "admin") {
        return res.status(403).json({ message: "Không có quyền cập nhật role!" });
      }
  
      // Nếu cập nhật mật khẩu, kiểm tra và mã hóa
      if (password) {
        if (!validator.isStrongPassword(password)) {
          return res.status(400).json({ message: "Mật khẩu quá yếu!" });
        }
        updateData.password = await bcrypt.hash(password, 10);
      }
  
      const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
  
      if (!updatedUser) return res.status(404).json({ message: "User không tồn tại!" });
  
      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  
// Delete user
router.delete("/:id", async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Không có quyền xóa User!" });
      }
  
      const { id } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID không hợp lệ!" });
      }
  
      const deletedUser = await User.findByIdAndDelete(id);
      if (!deletedUser) return res.status(404).json({ message: "User không tồn tại!" });
  
      res.json({ message: "User đã bị xóa thành công!" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  

export default router;
