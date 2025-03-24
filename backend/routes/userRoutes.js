import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import validator from "validator";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { authMiddleware } from "../middleware/auth.js"; // Import middleware

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

router.get("/me", authMiddleware, async (req, res) => {
  try {
    console.log("req.user in /me:", req.user); // Debug
    if (!req.user || !req.user.id) {
      return res.status(400).json({ message: "User ID not found in request" });
    }
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error fetching user info:", error.message);
    res.status(500).json({ message: error.message });
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
  

// Google Login
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
      res.status(400).json({ message: "Email not verified!" });
    }
  } catch (error) {
    console.error("Error during Google login:", error); // Log the error
    res.status(500).json({ message: "Server error!", error: error.message });
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
      res.status(201).json({ message: "Đăng ký thành công!", user });
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
      return res.status(404).json({ message: "User not found!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials!" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ token, user });
  } catch (error) {
    console.error("Login error:", error); // Log the error
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

export default router;
