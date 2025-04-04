import express from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import axios from "axios";
const router = express.Router();

// Middleware kiểm tra userId hợp lệ
const validateUser = async (req, res, next) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Thiếu userId!" });

  const userExists = await User.findById(userId);
  if (!userExists) return res.status(404).json({ error: "Người dùng không tồn tại!" });

  next();
};

// Middleware kiểm tra productId hợp lệ
const validateProduct = async (req, res, next) => {
  const { productId, quantity } = req.body;

  if (!productId) return res.status(400).json({ error: "Thiếu productId!" });

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: "Sản phẩm không tồn tại!" });

  if (quantity <= 0) return res.status(400).json({ error: "Số lượng không hợp lệ!" });

  req.product = product;
  next();
};

// Thêm sản phẩm vào giỏ hàng
router.post("/add", validateUser, validateProduct, async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {
    let cart = await Cart.findOne({ userId });

    if (cart) {
      const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ productId, quantity });
      }
    } else {
      cart = new Cart({ userId, items: [{ productId, quantity }] });
    }

    await cart.save();
    res.status(200).json({ message: "Thêm vào giỏ hàng thành công!", cart });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi thêm sản phẩm vào giỏ hàng" });
  }
});

// Cập nhật số lượng sản phẩm trong giỏ hàng
router.put("/update", validateUser, validateProduct, async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: "Giỏ hàng không tồn tại!" });

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex === -1) return res.status(404).json({ error: "Sản phẩm không có trong giỏ hàng!" });

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();

    // Populate và lấy thông tin giá từ API discount
    const updatedCart = await Cart.findOne({ userId }).populate("items.productId");
    const enrichedItems = await Promise.all(
      updatedCart.items.map(async (item) => {
        try {
          const discountResponse = await axios.get(
            `http://localhost:5000/api/discounts/apply/${item.productId._id}`
          );
          return {
            ...item.toObject(),
            productId: {
              ...item.productId.toObject(),
              originalPrice: discountResponse.data.originalPrice ?? item.productId.price,
              discountedPrice: discountResponse.data.discountedPrice ?? item.productId.price,
            },
          };
        } catch (error) {
          console.error(`Lỗi lấy giảm giá cho sản phẩm ${item.productId._id}:`, error);
          return {
            ...item.toObject(),
            productId: {
              ...item.productId.toObject(),
              originalPrice: item.productId.price,
              discountedPrice: item.productId.price,
            },
          };
        }
      })
    );

    updatedCart.items = enrichedItems;
    res.status(200).json({ message: "Cập nhật số lượng thành công!", cart: updatedCart });
  } catch (error) {
    console.error("Lỗi khi cập nhật giỏ hàng:", error);
    res.status(500).json({ error: "Lỗi khi cập nhật giỏ hàng" });
  }
});

// Xóa sản phẩm khỏi giỏ hàng
router.delete("/remove", async (req, res) => {
  const { userId, productId } = req.body;
  
  if (!userId || !productId) {
    return res.status(400).json({ message: "Thiếu userId hoặc productId!" });
  }

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Giỏ hàng không tồn tại!" });
    }

    // Lọc bỏ sản phẩm cần xóa
    cart.items = cart.items.filter(item => item.productId.toString() !== productId);

    await cart.save();

    // Populate items.productId trước khi trả về
    const updatedCart = await Cart.findOne({ userId }).populate("items.productId");
    res.json({ message: "Đã xóa sản phẩm khỏi giỏ hàng!", cart: updatedCart });
  } catch (err) {
    console.error("Lỗi khi xóa sản phẩm khỏi giỏ hàng:", err);
    res.status(500).json({ message: err.message });
  }
});

// Xóa toàn bộ giỏ hàng (dùng sau khi thanh toán)
router.delete("/remove-all/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const cart = await Cart.findOneAndDelete({ userId });
    if (!cart) return res.status(404).json({ error: "Giỏ hàng không tồn tại!" });

    res.status(200).json({ message: "Đã xóa toàn bộ giỏ hàng!" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi xóa giỏ hàng" });
  }
});

// Lấy giỏ hàng của người dùng
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) return res.status(404).json({ error: "Giỏ hàng trống!" });

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi lấy giỏ hàng" });
  }
});

export default router;