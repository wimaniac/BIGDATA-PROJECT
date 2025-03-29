import mongoose from "mongoose";
import Order from "../models/Order.js";
import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";
import Warehouse from "../models/Warehouse.js";
import axios from "axios";
import { scheduleJob } from "node-schedule";

// Hàm tính khoảng cách
const calculateDistance = async (city1, city2) => {
  try {
    const apiKey = "5b3ce3597851110001cf6248cec8ea436c0e4860877fe546696f27f0";
    const coords1 = await getCoordinates(city1);
    const coords2 = await getCoordinates(city2);

    const response = await axios.get(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${coords1.lng},${coords1.lat}&end=${coords2.lng},${coords2.lat}`
    );
    const distanceInMeters = response.data.features[0].properties.segments[0].distance;
    return distanceInMeters / 1000;
  } catch (err) {
    console.error(`Lỗi khi tính khoảng cách giữa ${city1} và ${city2}:`, err.message);
    return Infinity;
  }
};

// Hàm lấy tọa độ
const getCoordinates = async (city) => {
  try {
    const apiKey = "5b3ce3597851110001cf6248cec8ea436c0e4860877fe546696f27f0";
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

// Job tracker đồng bộ tồn kho
const syncInventory = async () => {
  console.log("Bắt đầu job đồng bộ tồn kho...");
  try {
    // --- Giai đoạn MAP 1: Lấy danh sách tồn kho hiện tại ---
    const inventoryItems = await Inventory.find()
      .populate("product")
      .populate("warehouse")
      .lean();

    const inventoryMapped = inventoryItems.map((item) => ({
      key: item.product._id.toString(), // Key là productId
      value: {
        inventoryId: item._id.toString(),
        warehouseId: item.warehouse._id.toString(),
        currentQuantity: item.quantity,
        warehouseCity: item.warehouse.location.city,
      },
    }));

    // --- Giai đoạn MAP 2: Lấy danh sách đơn hàng "Đã giao" chưa xử lý ---
    const orders = await Order.find({ status: "Đã giao", processed: { $ne: true } })
      .populate("products.product")
      .populate("user")
      .lean();

    if (!orders.length) {
      console.log("Không có đơn hàng 'Đã giao' nào cần xử lý!");
      return;
    }

    const orderMapped = orders.flatMap((order) => {
      const shippingCity = order.shippingInfo?.address?.city || order.user?.address?.city;
      if (!shippingCity) {
        console.warn(`Đơn hàng ${order._id} thiếu thông tin thành phố giao hàng!`);
        return [];
      }

      return order.products.map((item) => ({
        key: item.product._id.toString(), // Key là productId
        value: {
          orderId: order._id.toString(),
          quantityToReduce: item.quantity,
          shippingCity,
        },
      }));
    });

    // --- Giai đoạn COMBINE: Kết hợp dữ liệu từ Inventory và Order ---
    const combinedUpdates = await Promise.all(
      orderMapped.map(async ({ key, value }) => {
        const { orderId, quantityToReduce, shippingCity } = value;

        // Tìm kho gần nhất trong danh sách tồn kho đã map
        const inventoryForProduct = inventoryMapped.filter((inv) => inv.key === key);
        if (!inventoryForProduct.length) {
          console.warn(`Không tìm thấy tồn kho cho sản phẩm ${key} trong đơn ${orderId}`);
          return null;
        }

        const warehouseDistances = await Promise.all(
          inventoryForProduct.map(async (inv) => {
            const distance = await calculateDistance(shippingCity, inv.value.warehouseCity);
            return { ...inv.value, distance };
          })
        );

        warehouseDistances.sort((a, b) => a.distance - b.distance);

        const nearest = warehouseDistances.find((inv) => inv.currentQuantity >= quantityToReduce);
        if (!nearest) {
          console.warn(`Không có kho nào đủ hàng cho sản phẩm ${key} trong đơn ${orderId}`);
          return null;
        }

        return {
          productId: key,
          inventoryId: nearest.inventoryId,
          warehouseId: nearest.warehouseId,
          quantityToReduce,
          orderId,
        };
      })
    );

    const validUpdates = combinedUpdates.filter((update) => update !== null);

    // --- Giai đoạn REDUCE: Tổng hợp và chuẩn bị cập nhật ---
    const updatesByInventory = validUpdates.reduce((acc, update) => {
      const { inventoryId, quantityToReduce } = update;
      if (!acc[inventoryId]) {
        acc[inventoryId] = { ...update, totalToReduce: 0 };
      }
      acc[inventoryId].totalToReduce += quantityToReduce;
      return acc;
    }, {});

    // --- Giai đoạn FINALIZE: Thực hiện cập nhật tồn kho và đồng bộ stock ---
    for (const update of Object.values(updatesByInventory)) {
      const { productId, inventoryId, totalToReduce, orderId } = update;

      const inventoryItem = await Inventory.findById(inventoryId);
      if (!inventoryItem) {
        console.warn(`Không tìm thấy inventory ${inventoryId} cho sản phẩm ${productId}`);
        continue;
      }

      if (inventoryItem.quantity < totalToReduce) {
        console.warn(`Kho không đủ hàng cho sản phẩm ${productId}: Còn ${inventoryItem.quantity}, Cần ${totalToReduce}`);
        continue;
      }

      inventoryItem.quantity -= totalToReduce;
      await inventoryItem.save();
      console.log(`Đã giảm ${totalToReduce} sản phẩm ${productId} tại kho ${inventoryItem.warehouse}`);

      // Đồng bộ Product.stock
      const totalStock = await Inventory.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId) } },
        { $group: { _id: "$product", total: { $sum: "$quantity" } } },
      ]);
      const newStock = totalStock[0]?.total || 0;
      await Product.findByIdAndUpdate(productId, { stock: newStock });
      console.log(`Đã đồng bộ stock cho sản phẩm ${productId}: ${newStock}`);

      // Đánh dấu đơn hàng đã xử lý
      await Order.findByIdAndUpdate(orderId, { processed: true });
    }

    console.log("Hoàn tất đồng bộ tồn kho.");
  } catch (err) {
    console.error("Lỗi trong job đồng bộ tồn kho:", err.stack);
  }
};

// Lập lịch chạy job mỗi 5 phút
scheduleJob("*/5 * * * *", syncInventory);

export default syncInventory;