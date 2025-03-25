import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";

// Order Inventory Mapper
// Mục tiêu: Trích xuất các sản phẩm đã được đặt hàng và kiểm tra số lượng tồn kho.
async function orderInventoryMapper() {
  const orders = await Order.find();
  const orderMap = new Map();

  // Duyệt qua từng đơn hàng và sản phẩm trong đơn hàng
  orders.forEach((order) => {
    order.products.forEach((product) => {
      if (!orderMap.has(product.product.toString())) {
        orderMap.set(product.product.toString(), []);
      }
      // Thêm số lượng sản phẩm vào map
      orderMap.get(product.product.toString()).push(product.quantity);
    });
  });

  return orderMap;
}

// Product Info Mapper
// Mục tiêu: Trích xuất thông tin sản phẩm như giá, danh mục, nhà cung cấp.
async function productInfoMapper() {
  const products = await Product.find();
  const productMap = new Map();

  // Duyệt qua từng sản phẩm và lưu thông tin vào map
  products.forEach((product) => {
    productMap.set(product._id.toString(), {
      price: product.price,
      category: product.parentCategory,
      supplier: product.supplier,
    });
  });

  return productMap;
}

// Inventory Status Mapper
// Mục tiêu: Kiểm tra số lượng hàng tồn kho trong Inventory.js
async function inventoryStatusMapper() {
  const inventoryItems = await Inventory.find();
  const inventoryMap = new Map();

  // Duyệt qua từng mục tồn kho và lưu số lượng vào map
  inventoryItems.forEach((item) => {
    inventoryMap.set(item.product.toString(), item.quantity);
  });

  return inventoryMap;
}

// Inventory Update Reducer
// Chức năng: Kết hợp thông tin từ cả 3 Mapper trên và cập nhật tồn kho
async function inventoryUpdateReducer(orderMap, productMap, inventoryMap) {
  for (const [productId, quantities] of orderMap.entries()) {
    const totalOrdered = quantities.reduce((acc, qty) => acc + qty, 0);
    const availableStock = inventoryMap.get(productId) || 0;

    // Kiểm tra nếu số lượng tồn kho đủ để đáp ứng đơn hàng
    if (availableStock >= totalOrdered) {
      inventoryMap.set(productId, availableStock - totalOrdered);
      await Order.updateMany(
        { "products.product": productId },
        { $set: { status: "Đã giao" } }
      );
    } else {
      await Order.updateMany(
        { "products.product": productId },
        { $set: { status: "Đã hủy" } }
      );
    }
  }

  // Cập nhật số lượng tồn kho
  for (const [productId, newQuantity] of inventoryMap.entries()) {
    await Inventory.updateOne(
      { product: productId },
      { $set: { quantity: newQuantity } }
    );
  }
}

// Main function to run the job tracker
// Hàm chính để chạy job tracker
async function runInventoryJobTracker() {
  const orderMap = await orderInventoryMapper();
  const productMap = await productInfoMapper();
  const inventoryMap = await inventoryStatusMapper();

  await inventoryUpdateReducer(orderMap, productMap, inventoryMap);
}

// Execute the job tracker
// Thực thi job tracker
runInventoryJobTracker().catch(console.error);
