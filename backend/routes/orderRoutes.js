import express from "express";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js"; 
import mongoose from "mongoose";
const router = express.Router();
import jwt from "jsonwebtoken";
import Inventory from "../models/Inventory.js";
import Warehouse from "../models/Warehouse.js";
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
// Route tính tổng doanh thu và số lượng sản phẩm bán theo danh mục
router.get("/revenue-by-category", checkRole, async (req, res) => {
  try {
    // TaskTracker: Lấy tất cả đơn hàng có status "Đã giao"
    const orders = await Order.find({ status: "Đã giao" })
      .populate({
        path: "products.product",
        select: "name price parentCategory",
        populate: { path: "parentCategory", select: "name" },
      })
      .lean();

    console.log("Đơn hàng tìm thấy:", orders.length);
    if (!orders || orders.length === 0) {
      return res.status(200).json({ message: "Không có đơn hàng nào đã giao!", data: [] });
    }

    // Map: Tạo cặp key-value từ dữ liệu đơn hàng
    const mappedData = orders.flatMap((order) => {
      if (!order.products || !Array.isArray(order.products)) {
        console.warn(`Đơn hàng ${order._id} không có sản phẩm hợp lệ`);
        return [];
      }
      return order.products.map((item) => {
        const product = item.product;
        if (!product || !product.price || !product.parentCategory) {
          console.warn(`Sản phẩm trong đơn hàng ${order._id} không hợp lệ:`, item);
          return { key: "unknown", value: { quantity: item.quantity, revenue: 0, productName: "Unknown" } };
        }
        return {
          key: product.parentCategory._id.toString(),
          value: {
            quantity: item.quantity,
            revenue: item.quantity * product.price,
            productName: product.name,
            productId: product._id.toString(),
          },
        };
      });
    });

    // Partition/Combine: Nhóm theo danh mục và tính tổng tạm thời
    const combinedData = mappedData.reduce((acc, { key, value }) => {
      if (!acc[key]) {
        acc[key] = {
          totalRevenue: 0,
          totalSoldItems: 0,
          products: {},
        };
      }
      acc[key].totalRevenue += value.revenue;
      acc[key].totalSoldItems += value.quantity;
      if (!acc[key].products[value.productId]) {
        acc[key].products[value.productId] = {
          productName: value.productName,
          quantity: 0,
          revenue: 0,
        };
      }
      acc[key].products[value.productId].quantity += value.quantity;
      acc[key].products[value.productId].revenue += value.revenue;
      return acc;
    }, {});

    console.log("Doanh thu và số lượng tạm thời theo danh mục:", combinedData);

    // Reduce: Tạo kết quả cuối cùng với thông tin danh mục
    const categoryRevenues = await Promise.all(
      Object.entries(combinedData).map(async ([categoryId, data]) => {
        let categoryName = "Unknown";
        try {
          const category = await Category.findById(categoryId);
          categoryName = category ? category.name : "Unknown";
        } catch (err) {
          console.error(`Lỗi khi lấy danh mục ${categoryId}:`, err.message);
        }
        return {
          categoryId,
          categoryName,
          totalRevenue: data.totalRevenue,
          totalSoldItems: data.totalSoldItems,
          products: Object.values(data.products), // Chuyển object thành mảng
        };
      })
    );

    console.log("Kết quả cuối cùng:", categoryRevenues);
    res.json(categoryRevenues);
  } catch (err) {
    console.error("Lỗi khi tính doanh thu theo danh mục:", err.stack);
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});
router.get("/revenue-by-time", checkRole, async (req, res) => {
  try {
    const { period } = req.query; // "day", "month", "year"
    if (!["day", "month", "year"].includes(period)) {
      return res.status(400).json({ message: "Period phải là 'day', 'month' hoặc 'year'" });
    }

    // TaskTracker: Lấy tất cả đơn hàng đã giao
    const orders = await Order.find({ status: "Đã giao" })
      .populate("products.product", "price")
      .lean();

    if (!orders || orders.length === 0) {
      return res.status(200).json({ message: "Không có đơn hàng nào đã giao!", data: [] });
    }

    // Map: Tạo cặp key-value dựa trên thời gian
    const mappedData = orders.map((order) => {
      const date = new Date(order.createdAt);
      let key;
      if (period === "day") {
        key = date.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (period === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
      } else {
        key = date.getFullYear().toString(); // YYYY
      }
      const revenue = order.products.reduce(
        (sum, item) => sum + item.quantity * (item.product?.price || 0),
        0
      );
      return { key, value: revenue };
    });

    // Partition/Combine: Nhóm theo thời gian và tính tổng
    const combinedData = mappedData.reduce((acc, { key, value }) => {
      acc[key] = (acc[key] || 0) + value;
      return acc;
    }, {});

    // Reduce: Chuyển thành mảng để dùng trong biểu đồ
    const revenueByTime = Object.entries(combinedData).map(([time, revenue]) => ({
      time,
      revenue,
    })).sort((a, b) => a.time.localeCompare(b.time)); // Sắp xếp theo thời gian

    console.log(`Doanh thu theo ${period}:`, revenueByTime);
    res.json(revenueByTime);
  } catch (err) {
    console.error("Lỗi khi tính doanh thu theo thời gian:", err.stack);
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});


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
// Create a new order
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

    const mappedData = products.map(item => ({
      key: item.product,
      value: { quantity: item.quantity, city: shippingInfo.address.city }
    }));

    const userCity = shippingInfo.address.city;
    const warehouseDistances = await Promise.all(
      warehouses.map(async warehouse => {
        const distance = await calculateDistance(userCity, warehouse.location);
        return { warehouse, distance };
      })
    );

    warehouseDistances.sort((a, b) => a.distance - b.distance);
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

    // Cập nhật tồn kho vật lý (Inventory.quantity) và tính lại Product.stock
    for (const product of products) {
      const inventory = inventories.find(
        inv => inv.product.toString() === product.product && inv.warehouse._id.toString() === selectedWarehouse._id.toString()
      );
      inventory.quantity -= product.quantity;
      await Inventory.findByIdAndUpdate(inventory._id, { quantity: inventory.quantity });

      // Tính lại Product.stock
      const totalStock = await Inventory.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(product.product) } },
        { $group: { _id: "$product", total: { $sum: "$quantity" } } }
      ]);
      const newStock = totalStock[0]?.total || 0;
      await Product.findByIdAndUpdate(product.product, { stock: newStock });
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
// Get all orders
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
// Get order by ID
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
// Thêm vào orderRoutes.js
// Route lấy đơn hàng của người dùng
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Không có token!" });
  }

  try {
    // Xác thực token và kiểm tra userId
    console.log("Token nhận được:", token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key"); // Đảm bảo có JWT_SECRET
    console.log("Token decoded:", decoded);
    if (decoded.id !== userId) {
      return res.status(403).json({ message: "Không có quyền truy cập!" });
    }

    // Truy vấn đơn hàng
    const orders = await Order.find({ user: userId })
      .populate("products.product", "name price")
      .lean(); // Thêm .lean() để tăng tốc độ nếu không cần Mongoose Document
    console.log("Đơn hàng tìm thấy:", orders);

    res.json(orders);
  } catch (err) {
    console.error("Lỗi trong GET /user/:userId:", err.message); // Log chi tiết lỗi
    console.error("Stack trace:", err.stack);
    res.status(500).json({ message: "Lỗi server: " + err.message });
  }
});

// Update order
router.put("/:id", async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedOrder)
      return res.status(404).json({ message: "Order not found" });
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete order
router.delete("/:id", async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder)
      return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;