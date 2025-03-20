import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";

// Load biến môi trường
dotenv.config();

// Kiểm tra biến môi trường
if (!process.env.CONNECT_STRING) {
  console.error("❌ Lỗi: Biến môi trường CONNECT_STRING không được tìm thấy!");
  process.exit(1);
}

// Kết nối MongoDB
mongoose.connect(process.env.CONNECT_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ Kết nối MongoDB thành công!");
  runInventoryJobTracker();
}).catch((err) => {
  console.error("❌ Lỗi kết nối MongoDB:", err);
  process.exit(1);
});

// Order Inventory Mapper - Lấy sản phẩm đã đặt hàng
async function orderInventoryMapper() {
  const orders = await Order.find();
  const orderMap = new Map();

  orders.forEach((order) => {
    order.products.forEach((product) => {
      if (!orderMap.has(product.product.toString())) {
        orderMap.set(product.product.toString(), []);
      }
      orderMap.get(product.product.toString()).push(product.quantity);
    });
  });

  return orderMap;
}

// Product Info Mapper - Lấy thông tin sản phẩm
async function productInfoMapper() {
  const products = await Product.find();
  const productMap = new Map();

  products.forEach((product) => {
    productMap.set(product._id.toString(), {
      price: product.price,
      category: product.parentCategory,
      supplier: product.supplier,
    });
  });

  return productMap;
}

// Inventory Status Mapper - Kiểm tra hàng tồn kho
async function inventoryStatusMapper() {
  const inventoryItems = await Inventory.find();
  const inventoryMap = new Map();

  inventoryItems.forEach((item) => {
    inventoryMap.set(item.product.toString(), item.quantity);
  });

  return inventoryMap;
}

// Inventory Update Reducer - Cập nhật tồn kho và trạng thái đơn hàng
async function inventoryUpdateReducer(orderMap, productMap, inventoryMap) {
  for (const [productId, quantities] of orderMap.entries()) {
    const totalOrdered = quantities.reduce((acc, qty) => acc + qty, 0);
    const availableStock = inventoryMap.get(productId) || 0;

    if (availableStock >= totalOrdered) {
      inventoryMap.set(productId, availableStock - totalOrdered);
      await Order.updateMany(
        { "products.product": productId },
        { $set: { status: "Đã giao" } }
      );
      console.log(`✅ Sản phẩm ${productId} đã được giao.`);
    } else {
      await Order.updateMany(
        { "products.product": productId },
        { $set: { status: "Đã hủy" } }
      );
      console.log(`❌ Sản phẩm ${productId} bị hủy do tồn kho không đủ.`);
    }
  }

  // Cập nhật số lượng tồn kho
  for (const [productId, newQuantity] of inventoryMap.entries()) {
    await Inventory.updateOne(
      { product: productId },
      { $set: { quantity: newQuantity } }
    );
    console.log(`🔄 Cập nhật tồn kho: ${productId} - Số lượng mới: ${newQuantity}`);
  }
}

// Chạy JobTracker
async function runInventoryJobTracker() {
  try {
    console.log("🔄 Đang chạy JobTracker cập nhật tồn kho...");
    
    const orderMap = await orderInventoryMapper();
    const productMap = await productInfoMapper();
    const inventoryMap = await inventoryStatusMapper();

    await inventoryUpdateReducer(orderMap, productMap, inventoryMap);

    console.log("✅ JobTracker cập nhật tồn kho hoàn thành!");
  } catch (error) {
    console.error("❌ Lỗi khi chạy JobTracker:", error);
  } finally {
    mongoose.connection.close();
  }
}
