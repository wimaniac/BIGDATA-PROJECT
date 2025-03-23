import express from 'express';
const router = express.Router();
import Cart from '../models/Cart.js'; 
import Product from '../models/Product.js';
import User from '../models/User.js';

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

  req.product = product; // Lưu sản phẩm vào request để sử dụng sau
  next();
};

// Thêm sản phẩm vào giỏ hàng
router.post('/add', validateUser, validateProduct, async (req, res) => {
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
router.put('/update', validateUser, validateProduct, async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: "Giỏ hàng không tồn tại!" });

    const item = cart.items.find(item => item.productId.toString() === productId);
    if (!item) return res.status(404).json({ error: "Sản phẩm không có trong giỏ hàng!" });

    item.quantity = quantity;
    await cart.save();
    res.status(200).json({ message: "Cập nhật số lượng thành công!", cart });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi cập nhật giỏ hàng" });
  }
});

// Xóa sản phẩm khỏi giỏ hàng
router.delete('/remove', validateUser, async (req, res) => {
  const { userId, productId } = req.body;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ error: "Giỏ hàng không tồn tại!" });

    cart.items = cart.items.filter(item => item.productId.toString() !== productId);
    await cart.save();
    res.status(200).json({ message: "Xóa sản phẩm khỏi giỏ hàng thành công!", cart });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi xóa sản phẩm khỏi giỏ hàng" });
  }
});

// Lấy giỏ hàng của người dùng
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart) return res.status(404).json({ error: "Giỏ hàng trống!" });

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi lấy giỏ hàng" });
  }
});

export default router;
