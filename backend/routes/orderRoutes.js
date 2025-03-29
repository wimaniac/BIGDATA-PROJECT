import express from "express";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import Warehouse from "../models/Warehouse.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Middleware kiểm tra vai trò
const checkRole = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Không có token!" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !["sales", "manager", "admin"].includes(user.role)) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập!" });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token không hợp lệ!" });
  }
};

// Hàm lấy tọa độ từ thành phố bằng Radar API
const getCoordinates = async (city) => {
  try {
    const apiKey = process.env.RADAR_API_KEY;
    console.log("Sending request to Radar with API Key:", apiKey);
    const response = await axios.get(
      `https://api.radar.io/v1/geocode/forward?query=${encodeURIComponent(city)}`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );
    console.log("Radar Geocode Response:", response.data);

    if (!response.data.addresses || response.data.addresses.length === 0) {
      throw new Error(`Không tìm thấy tọa độ của ${city}`);
    }

    const [longitude, latitude] = response.data.addresses[0].geometry.coordinates;
    return { lng: longitude, lat: latitude };
  } catch (err) {
    console.error(`Lỗi khi lấy tọa độ của ${city}:`, err.message);
    return { lng: 0, lat: 0 };
  }
};


// Hàm tính khoảng cách bằng Radar Distance API
const calculateDistance = async (city1, city2) => {
  const coords1 = await getCoordinates(city1);
  const coords2 = await getCoordinates(city2);

  if (!coords1.lat || !coords1.lng || !coords2.lat || !coords2.lng) {
    console.log(`Dữ liệu tọa độ không hợp lệ: ${city1} (${coords1.lat}, ${coords1.lng}), ${city2} (${coords2.lat}, ${coords2.lng})`);
    return Infinity;
  }

  try {
    const apiKey = process.env.RADAR_API_KEY;
    const url = `https://api.radar.io/v1/route/distance?origin=${coords1.lat},${coords1.lng}&destination=${coords2.lat},${coords2.lng}&modes=car`;
    console.log(`Tính khoảng cách giữa ${city1} and ${city2}:`, url);
    const response = await axios.get(url, {
      headers: { Authorization: apiKey },
    });

    if (!response.data.routes || !response.data.routes.car) {
      throw new Error("Không tìm thấy dữ liệu khoảng cách");
    }

    return response.data.routes.car.distance.value / 1000; // Chuyển sang km
  } catch (err) {
    console.error(`Lỗi khi tính khoảng cách giữa ${city1} và ${city2}:`, err.response?.data || err.message);
    return Infinity;
  }
};


// Hàm tìm kho gần nhất
const findNearestWarehouse = async (shippingCity, productId, quantityOrdered) => {
  const inventoryItems = await Inventory.find({ product: productId })
    .populate("warehouse")
    .lean();

  if (!inventoryItems.length) return null;

  const warehouseDistances = await Promise.all(
    inventoryItems.map(async (item) => {
      const warehouseCity = item.warehouse.location.city;
      const distance = await calculateDistance(shippingCity, warehouseCity);
      console.log(`Kho ${warehouseCity} - ${shippingCity}: ${distance} km`);
      return { warehouse: item.warehouse, distance, inventory: item };
    })
  );

  warehouseDistances.sort((a, b) => a.distance - b.distance);
  console.log("Kho sau khi sắp xếp:", warehouseDistances.map(w => `${w.warehouse.location.city}: ${w.distance} km`));

  for (const { warehouse, inventory } of warehouseDistances) {
    if (inventory.quantity >= quantityOrdered) {
      return warehouse;
    }
  }
  return warehouseDistances[0]?.warehouse || null;
};
// Tạo đơn hàng mới
router.post("/", async (req, res) => {
  const { user, products, totalAmount, shippingInfo, status } = req.body;

  if (!user || !products || !totalAmount || !shippingInfo) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết!" });
  }

  try {
    const userCity = shippingInfo.address.city;

    // Tìm kho gần nhất cho từng sản phẩm
    const productAssignments = await Promise.all(
      products.map(async (item) => {
        const warehouse = await findNearestWarehouse(userCity, item.product, item.quantity);
        if (!warehouse) {
          throw new Error(`Không tìm thấy kho đủ tồn kho cho sản phẩm ${item.product}`);
        }
        return {
          product: item.product,
          quantity: item.quantity,
          warehouse: warehouse._id,
        };
      })
    );

    // Tạo đơn hàng
    const order = new Order({
      user,
      products: productAssignments,
      totalAmount,
      shippingInfo: shippingInfo || {},
      status: status || "Đang xử lí",
    });

    const newOrder = await order.save();

    // Populate thông tin đơn hàng để trả về
    const populatedOrder = await Order.findById(newOrder._id)
      .populate("products.product", "name price")
      .populate("products.warehouse", "name location")
      .lean();

    // Cập nhật thông tin người dùng với shippingInfo (nếu cần)
    const updatedUser = await User.findByIdAndUpdate(
      user,
      { $set: { shippingInfo: shippingInfo } },
      { new: true }
    );
    if (!updatedUser) {
      console.warn(`Không tìm thấy người dùng ${user} để cập nhật thông tin!`);
    } else {
      console.log(`Đã cập nhật thông tin người dùng ${user} với shippingInfo:`, shippingInfo);
    }

    // Kiểm tra và xóa giỏ hàng (nếu có)
    const deletedCart = await Cart.findOneAndDelete({ userId: user });
    if (deletedCart) {
      console.log(`Đã xóa giỏ hàng của người dùng ${user}`);
    } else {
      console.log(`Không tìm thấy giỏ hàng của người dùng ${user} để xóa - có thể giỏ hàng chưa được lưu vào database`);
    }

    res.status(201).json({
      message: "Tạo đơn hàng thành công!",
      order: populatedOrder,
    });
  } catch (err) {
    console.error("Lỗi khi tạo đơn hàng:", err);
    res.status(400).json({ message: err.message });
  }
});

router.get("/", checkRole, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("products.product", "name price")
      .populate("products.warehouse", "name location");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("products.product", "name price");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Không có token!" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id !== userId) {
      return res.status(403).json({ message: "Không có quyền truy cập!" });
    }

    const orders = await Order.find({ user: userId })
      .populate("products.product", "name price")
      .lean();
    res.json(orders);
  } catch (err) {
    console.error("Lỗi trong GET /user/:userId:", err.message);
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// Cập nhật trạng thái đơn hàng - Không giảm tồn kho
router.put("/:id/status", async (req, res) => {
  const { status } = req.body;

  try {
    const order = await Order.findById(req.params.id)
      .populate("products.product")
      .populate("user");
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });

    order.status = status;
    await order.save();

    res.json(order);
  } catch (err) {
    console.error("Lỗi khi cập nhật trạng thái đơn hàng:", err);
    res.status(500).json({ message: err.message });
  }
});

// Xóa đơn hàng
router.delete("/:id", async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;