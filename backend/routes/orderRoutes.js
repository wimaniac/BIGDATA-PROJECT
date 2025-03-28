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
// Hàm tính khoảng cách bằng OpenRouteService Directions API
const calculateDistance = async (city1, city2) => {
  try {
    const apiKey = "5b3ce3597851110001cf6248cec8ea436c0e4860877fe546696f27f0"; // Thay bằng API key của bạn
    const coords1 = await getCoordinates(city1);
    const coords2 = await getCoordinates(city2);

    const response = await axios.get(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${coords1.lng},${coords1.lat}&end=${coords2.lng},${coords2.lat}`
    );

    const distanceInMeters = response.data.features[0].properties.segments[0].distance;
    return distanceInMeters / 1000; // Chuyển sang km
  } catch (err) {
    console.error(`Lỗi khi tính khoảng cách giữa ${city1} và ${city2}:`, err.message);
    return Infinity; // Trả về vô cực nếu lỗi để không chọn kho này
  }
};

// Hàm lấy tọa độ từ thành phố bằng OpenRouteService Geocoding
const getCoordinates = async (city) => {
  try {
    const apiKey = "5b3ce3597851110001cf6248cec8ea436c0e4860877fe546696f27f0"; // Thay bằng API key của bạn
    const response = await axios.get(
      `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(city)}&boundary.country=VN`
    );
    const { coordinates } = response.data.features[0].geometry;
    return { lng: coordinates[0], lat: coordinates[1] };
  } catch (err) {
    console.error(`Lỗi khi lấy tọa độ của ${city}:`, err.message);
    throw new Error("Không thể lấy tọa độ");
  }
};
// Hàm tìm kho gần nhất dựa trên OpenRouteService Directions API
const findNearestWarehouse = async (shippingCity, productId, quantityOrdered) => {
  const inventoryItems = await Inventory.find({ product: productId })
    .populate("warehouse")
    .lean();

  if (!inventoryItems.length) return null;

  const apiKey = "5b3ce3597851110001cf6248cec8ea436c0e4860877fe546696f27f0";

  const warehouseDistances = await Promise.all(
    inventoryItems.map(async (item) => {
      const warehouseCity = item.warehouse.location.city;
      const distance = await calculateDistance(shippingCity, warehouseCity);
      return { warehouse: item.warehouse, distance, inventory: item };
    })
  );

  warehouseDistances.sort((a, b) => a.distance - b.distance);

  for (const { warehouse, inventory } of warehouseDistances) {
    if (inventory.quantity >= quantityOrdered) { // Sử dụng quantityOrdered
      return warehouse;
    }
  }

  return warehouseDistances[0]?.warehouse || null;
};
// Tạo đơn hàng mới
router.post("/", async (req, res) => {
  const { user, products, totalAmount, shippingInfo, status } = req.body;

  if (!user || !products || !totalAmount) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết!" });
  }

  try {
    const warehouses = await Warehouse.find().lean();
    const inventories = await Inventory.find({ product: { $in: products.map(p => p.product) } })
      .populate("warehouse")
      .lean();

    const userCity = shippingInfo.address.city;
    let selectedWarehouse = null;

    // Kiểm tra kho có đủ hàng nhưng không giảm tồn kho
    for (const warehouse of warehouses) {
      const warehouseInventory = inventories.filter(
        inv => inv.warehouse._id.toString() === warehouse._id.toString()
      );
      const hasEnoughStock = products.every(product => {
        const inv = warehouseInventory.find(i => i.product.toString() === product.product);
        return inv && inv.quantity >= product.quantity;
      });

      if (hasEnoughStock) {
        selectedWarehouse = warehouse;
        break;
      }
    }

    if (!selectedWarehouse) {
      return res.status(400).json({ message: "Không có kho nào đủ tồn kho!" });
    }

    const order = new Order({
      user,
      products,
      totalAmount,
      shippingInfo: shippingInfo || {},
      status: status || "Đang xử lí",
      warehouse: selectedWarehouse._id,
    });
    const newOrder = await order.save();

    const deletedCart = await Cart.findOneAndDelete({ userId: user });
    console.log("Giỏ hàng đã xóa:", deletedCart);

    res.status(201).json({
      ...newOrder.toJSON(),
      warehouse: selectedWarehouse,
    });
  } catch (err) {
    console.error("Lỗi khi tạo đơn hàng:", err);
    res.status(400).json({ message: err.message });
  }
});
// Lấy tất cả đơn hàng
router.get("/", checkRole, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("products.product", "name price");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lấy đơn hàng theo ID
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

// Lấy đơn hàng của người dùng
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
router.get("/revenue-reports/category", checkRole, async (req, res) => {
  try {
    const reports = await RevenueByCategoryReport.find().sort({ createdAt: -1 }).limit(1); // Lấy báo cáo mới nhất
    res.json(reports[0]?.data || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lấy báo cáo doanh thu theo thời gian
router.get("/revenue-reports/time", checkRole, async (req, res) => {
  try {
    const { period } = req.query;
    if (!["day", "month", "year"].includes(period)) {
      return res.status(400).json({ message: "Period phải là 'day', 'month' hoặc 'year'" });
    }
    const reports = await RevenueByTimeReport.find({ period }).sort({ createdAt: -1 }).limit(1); // Lấy báo cáo mới nhất
    res.json(reports[0]?.data || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Lấy báo cáo doanh thu theo thời gian
router.get("/revenue-reports/time", checkRole, async (req, res) => {
  try {
    const { period } = req.query;
    if (!["day", "month", "year"].includes(period)) {
      return res.status(400).json({ message: "Period phải là 'day', 'month' hoặc 'year'" });
    }
    const reports = await RevenueByTimeReport.find({ period }).sort({ createdAt: -1 }).limit(1); // Lấy báo cáo mới nhất
    res.json(reports[0]?.data || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Cập nhật trạng thái đơn hàng
router.put("/:id/status", async (req, res) => {
  const { status } = req.body;

  try {
    const order = await Order.findById(req.params.id)
      .populate("products.product")
      .populate("user");
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });

    order.status = status;
    await order.save();

    if (status === "Đã giao") {
      const shippingCity = order.shippingInfo?.address?.city || order.user?.address?.city;
      if (!shippingCity) {
        return res.status(400).json({ message: "Không xác định được thành phố giao hàng!" });
      }

      const shippingCoords = await getCoordinates(shippingCity);

      for (const item of order.products) {
        const productId = item.product._id;
        const quantityOrdered = item.quantity; // Lấy quantityOrdered từ item.quantity

        const nearestWarehouse = await findNearestWarehouse(shippingCity, productId, quantityOrdered);
        if (!nearestWarehouse) {
          return res.status(400).json({
            message: `Không tìm thấy kho chứa sản phẩm ${item.product.name}`,
          });
        }

        const inventoryItem = await Inventory.findOne({
          product: productId,
          warehouse: nearestWarehouse._id,
        });
        if (!inventoryItem) {
          return res.status(400).json({
            message: `Sản phẩm ${item.product.name} không có trong kho ${nearestWarehouse.name}`,
          });
        }

        if (inventoryItem.quantity < quantityOrdered) {
          return res.status(400).json({
            message: `Kho ${nearestWarehouse.name} không đủ tồn kho cho ${item.product.name} (Còn: ${inventoryItem.quantity}, Cần: ${quantityOrdered})`,
          });
        }

        inventoryItem.quantity -= quantityOrdered;
        await inventoryItem.save();
        console.log(`Đã giảm ${quantityOrdered} sản phẩm ${item.product.name} tại kho ${nearestWarehouse.name}`);

        const totalStock = await Inventory.aggregate([
          { $match: { product: new mongoose.Types.ObjectId(productId) } },
          { $group: { _id: "$product", total: { $sum: "$quantity" } } },
        ]);
        const newStock = totalStock[0]?.total || 0;
        await Product.findByIdAndUpdate(productId, { stock: newStock });
        console.log(`Đã đồng bộ stock cho ${item.product.name}: ${item.product.stock} -> ${newStock}`);
      }
    }

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