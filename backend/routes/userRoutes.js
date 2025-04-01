import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import validator from "validator";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import mongoose from "mongoose";
const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const blacklistedTokens = new Set();
router.post("/auth/logout", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    blacklistedTokens.add(token);
  }
  res.json({ message: "Đăng xuất thành công!" });
});

// Middleware kiểm tra token
const checkBlacklist = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (blacklistedTokens.has(token)) {
    return res.status(401).json({ message: "Token đã bị vô hiệu hóa!" });
  }
  next();
};
// Get all users
router.get("/", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền truy cập!" });
    }

    const users = await User.find().select("-password"); // Không trả về mật khẩu
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error!", error: err.message });
  }
});

router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error!", error: err.message });
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
        googleId: googleId || undefined,
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
    const { id } = req.params;
    const updateData = req.body;
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.put("/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền thay đổi vai trò!" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    if (!["customer", "sales", "manager", "admin"].includes(role)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ!" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    user.role = role;
    await user.save();

    res.json({ role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Server error!", error: err.message });
  }
});
// Trong userRoutes.js
router.put("/:id/change-password", async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Kiểm tra mật khẩu hiện tại (chỉ áp dụng cho tài khoản local)
    if (user.provider === "local") {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Mật khẩu hiện tại không đúng!" });
      }
    } else {
      return res.status(400).json({ message: "Tài khoản Google không thể đổi mật khẩu tại đây!" });
    }

    // Kiểm tra độ mạnh của mật khẩu mới
    if (!validator.isStrongPassword(newPassword)) {
      return res.status(400).json({
        message:
          "Mật khẩu mới quá yếu! Cần ít nhất 8 ký tự, có chữ hoa, số và ký tự đặc biệt.",
      });
    }

    // Mã hóa mật khẩu mới và lưu
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Đổi mật khẩu thành công!" });
  } catch (err) {
    console.error("Error in change-password route:", err);
    res.status(500).json({ message: "Server error!", error: err.message });
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") {
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
  

router.post("/auth/google-login", async (req, res) => {
  const { tokenId } = req.body;
  try {
    console.log("Received tokenId:", tokenId); // Log the received tokenId
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    console.log("Google payload:", payload); // Log the payload received from Google

    const { email_verified, name, email, picture } = payload;

    if (email_verified) {
      let user = await User.findOne({ email });
      if (!user) {
        user = new User({
          name,
          email,
          googleId: ticket.getUserId(),
          avatar: picture,
          provider: "google",
        });
        await user.save();
      }
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      res.json({ token, user });
    } else {
      res.status(400).json({ message: "Email chưa được xác minh!" });
    }
  } catch (error) {
    console.error("Lỗi khi đăng nhập Google:", error); // Log the error
    res.status(500).json({ message: "Lỗi máy chủ!", error: error.message });
  }
});

// Google Register
router.post("/auth/google-register", async (req, res) => {
  const { tokenId } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email_verified, name, email, picture } = ticket.getPayload();

    if (email_verified) {
      let user = await User.findOne({ email });
      if (!user) {
        user = new User({
          name,
          email,
          googleId: ticket.getUserId(),
          avatar: picture,
          provider: "google",
        });
        await user.save();
      }
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
      res.status(201).json({ message: "Đăng ký thành công!", user, token });
    } else {
      res.status(400).json({ message: "Email không được xác thực!" });
    }
  } catch (error) {
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

// Login user
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Thông tin đăng nhập không hợp lệ!" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ!", error: error.message });
  }
});

export default router;
