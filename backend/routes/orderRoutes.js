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

// Hàm tính khoảng cách (sử dụng OpenRouteService)
async function calculateDistance(city1, city2) {
  try {
    const apiKey = "5b3ce3597851110001cf6248cec8ea436c0e4860877fe546696f27f0";
    const coords1 = await getCoordinates(city1);
    const coords2 = await getCoordinates(city2);
    const response = await axios.get(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${coords1.lng},${coords1.lat}&end=${coords2.lng},${coords2.lat}`
    );
    return response.data.features[0].properties.segments[0].distance / 1000; // km
  } catch (err) {
    console.error("Lỗi tính khoảng cách:", err);
    return Infinity;
  }
}

async function getCoordinates(city) {
  const apiKey = "5b3ce3597851110001cf6248cec8ea436c0e4860877fe546696f27f0";
  const response = await axios.get(
    `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(city)}&boundary.country=VN`
  );
  const { coordinates } = response.data.features[0].geometry;
  return { lng: coordinates[0], lat: coordinates[1] };
}

// Tạo đơn hàng mới
router.post("/", async (req, res) => {
  const { user, products, totalAmount, shippingInfo, status } = req.body;

  if (!user || !products || !totalAmount) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết!" });
  }

  try {
    // Lấy danh sách kho và tồn kho
    const warehouses = await Warehouse.find().lean();
    const inventories = await Inventory.find({ product: { $in: products.map(p => p.product) } })
      .populate("warehouse")
      .lean();

    // Tính khoảng cách và chọn kho gần nhất
    const userCity = shippingInfo.address.city;
    const warehouseDistances = await Promise.all(
      warehouses.map(async warehouse => {
        const distance = await calculateDistance(userCity, warehouse.location);
        return { warehouse, distance };
      })
    );

    warehouseDistances.sort((a, b) => a.distance - b.distance);

    // Tìm kho có đủ tồn kho
    let selectedWarehouse = null;
    for (const { warehouse } of warehouseDistances) {
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

    // Cập nhật tồn kho
    for (const product of products) {
      const inventory = inventories.find(
        inv => inv.product.toString() === product.product && inv.warehouse._id.toString() === selectedWarehouse._id.toString()
      );
      inventory.quantity -= product.quantity;
      await Inventory.findByIdAndUpdate(inventory._id, { quantity: inventory.quantity });
    }

    // Tạo đơn hàng mới
    const order = new Order({
      user,
      products,
      totalAmount,
      shippingInfo: shippingInfo || {},
      status: status || "Đang xử lí",
      warehouse: selectedWarehouse._id,
    });
    const newOrder = await order.save();

    // Xóa giỏ hàng
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
router.put("/:id/status", async (req, res) => {
  const { status } = req.body;

  try {
    const order = await Order.findById(req.params.id).populate("products.product").populate("user");
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });

    order.status = status;
    await order.save();

    // Xử lý tồn kho khi trạng thái là "Đã giao"
    if (status === "Đã giao") {
      const shippingCity = order.shippingInfo?.city || order.user.address.city;
      if (!shippingCity) {
        return res.status(400).json({ message: "Không xác định được thành phố giao hàng!" });
      }

      for (const item of order.products) {
        const productId = item.product._id;
        const quantityOrdered = item.quantity;

        // Tìm kho gần nhất
        const nearestWarehouse = await findNearestWarehouse(shippingCity, productId);
        if (!nearestWarehouse) {
          return res.status(400).json({ 
            message: `Không tìm thấy kho chứa sản phẩm ${item.product.name}` 
          });
        }

        // Tìm bản ghi Inventory tại kho gần nhất
        const inventoryItem = await Inventory.findOne({
          product: productId,
          warehouse: nearestWarehouse._id,
        });
        if (!inventoryItem) {
          return res.status(400).json({ 
            message: `Sản phẩm ${item.product.name} không có trong kho ${nearestWarehouse.name}` 
          });
        }

        // Kiểm tra và giảm số lượng
        if (inventoryItem.quantity < quantityOrdered) {
          return res.status(400).json({ 
            message: `Kho ${nearestWarehouse.name} không đủ tồn kho cho ${item.product.name} (Còn: ${inventoryItem.quantity}, Cần: ${quantityOrdered})` 
          });
        }

        inventoryItem.quantity -= quantityOrdered;
        await inventoryItem.save();
        console.log(`Đã giảm ${quantityOrdered} sản phẩm ${item.product.name} tại kho ${nearestWarehouse.name}`);

        // Đồng bộ Product.stock
        const totalStock = await Inventory.aggregate([
          { $match: { product: new mongoose.Types.ObjectId(productId) } },
          { $group: { _id: "$product", total: { $sum: "$quantity" } } }
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

// Hàm tìm kho gần nhất dựa trên thành phố
const findNearestWarehouse = async (shippingCity, productId) => {
  const inventoryItems = await Inventory.find({ product: productId })
    .populate("warehouse")
    .lean();

  if (!inventoryItems.length) return null;

  // Tìm kho có location chứa tên thành phố (giả định location là chuỗi như "Hà Nội")
  const nearest = inventoryItems.find(item => 
    item.warehouse.location.toLowerCase().includes(shippingCity.toLowerCase())
  );

  // Nếu không tìm thấy kho khớp, trả về kho đầu tiên có sản phẩm
  return nearest ? nearest.warehouse : inventoryItems[0].warehouse;
};

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