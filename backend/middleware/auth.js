import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    console.log("Token received:", token); // Debug
    console.log("JWT_SECRET:", process.env.JWT_SECRET); // Debug
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded); // Debug
    if (!decoded.id) {
      throw new Error("Token does not contain user ID");
    }
    req.user = { id: decoded.id }; // Đảm bảo req.user.id được thiết lập đúng
    console.log("req.user:", req.user); // Debug
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    res.status(401).json({ message: "Invalid token" });
  }
};