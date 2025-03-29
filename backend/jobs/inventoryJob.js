import mongoose from "mongoose";
import Order from "../models/Order.js";
import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";
import { scheduleJob } from "node-schedule";

// JobTracker: Quản lý công việc
const InventoryJob  = async () => {
  console.log("🔄 JobTracker quản lý tồn kho bắt đầu...");

  try {
    // Map Phase
    const mappedData = await MapPhase();

    // Partition Phase
    const partitionedData = PartitionPhase(mappedData);

    // Combine Phase
    const combinedData = CombinePhase(partitionedData);

    // Reduce Phase
    const { regionResults, productStock } = await ReducePhase(combinedData);

    // Output Phase
    await OutputPhase(regionResults, productStock);

    console.log("✅ JobTracker hoàn tất!");
  } catch (error) {
    console.error("❌ Lỗi JobTracker:", error);
  }
};

// **Map Phase: Thu thập dữ liệu và ánh xạ key-value**
const MapPhase = async () => {
  const orders = await Order.find({ status: { $in: ["Đang xử lí", "Đã giao"] } })
    .populate("products.product", "name")
    .populate("products.warehouse", "name")
    .lean();

  const inventoryItems = await Inventory.find()
    .populate("product", "name")
    .populate("warehouse", "name")
    .lean();

  const products = await Product.find().lean();

  let mappedData = [];

  // TaskTracker M1: Xử lý Orders
  orders.forEach((order) => {
    order.products.forEach((item) => {
      mappedData.push({
        key: `${item.product._id}-${item.warehouse._id}`,
        value: { type: "order", quantity: item.quantity, orderId: order._id },
      });
    });
  });

  // TaskTracker M2: Xử lý Inventory
  mappedData.push(
    ...inventoryItems.map((item) => ({
      key: `${item.product._id}-${item.warehouse._id}`,
      value: { type: "inventory", quantity: item.quantity, inventoryId: item._id },
    }))
  );

  // TaskTracker M3: Xử lý Product
  mappedData.push(
    ...products.map((product) => ({
      key: `${product._id}`,
      value: { type: "product", stock: product.stock, productId: product._id },
    }))
  );

  return mappedData;
};

// **Partition Phase: Nhóm dữ liệu theo key**
const PartitionPhase = (mappedData) => {
  const partitioned = {};
  mappedData.forEach(({ key, value }) => {
    if (!partitioned[key]) {
      partitioned[key] = [];
    }
    partitioned[key].push(value);
  });
  return partitioned;
};

// **Combine Phase: Tổng hợp dữ liệu trong từng nhóm**
const CombinePhase = (partitionedData) => {
  const combined = {};
  for (const key in partitionedData) {
    combined[key] = { orders: [], inventory: null, product: null };
    partitionedData[key].forEach((value) => {
      if (value.type === "order") {
        combined[key].orders.push(value);
      } else if (value.type === "inventory") {
        combined[key].inventory = value;
      } else if (value.type === "product") {
        combined[key].product = value;
      }
    });
  }
  return combined;
};

// **Reduce Phase: Xử lý tồn kho**
const ReducePhase = async (combinedData) => {
  let regionResults = {};
  let productStock = {};

  for (const key in combinedData) {
    const { orders, inventory, product } = combinedData[key];

    if (product) {
      // TaskTracker R1: Xử lý stock trong Product
      regionResults[key] = {
        productId: key,
        initialStock: product.stock,
      };
    } else {
      // TaskTracker R2: Xử lý số lượng tồn kho tại các kho hàng
      const [productId, warehouseId] = key.split("-");
      const totalOrdered = orders.reduce((sum, order) => sum + order.quantity, 0);
      const currentQuantity = inventory ? inventory.quantity : 0;

      regionResults[key] = {
        productId,
        warehouseId,
        initialQuantity: currentQuantity,
        orderedQuantity: totalOrdered,
        finalQuantity: Math.max(0, currentQuantity - totalOrdered),
        inventoryId: inventory?.inventoryId || null,
      };

      if (!productStock[productId]) {
        productStock[productId] = 0;
      }
      productStock[productId] += regionResults[key].finalQuantity;
    }
  }

  return { regionResults, productStock };
};

// **Output Phase: Cập nhật Inventory & Product**
const OutputPhase = async (regionResults, productStock) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Cập nhật Inventory
    const inventoryUpdates = Object.keys(regionResults)
      .filter((key) => key.includes("-"))
      .map(async (key) => {
        const { inventoryId, finalQuantity, productId, warehouseId } = regionResults[key];
        if (inventoryId) {
          return Inventory.findByIdAndUpdate(inventoryId, { quantity: finalQuantity }, { new: true });
        } else {
          const newInventory = new Inventory({ product: productId, warehouse: warehouseId, quantity: finalQuantity });
          return newInventory.save();
        }
      });

    await Promise.all(inventoryUpdates);
    console.log("✅ Inventory đã được cập nhật.");

    // Cập nhật Product stock
    const productUpdates = Object.keys(productStock).map((productId) =>
      Product.findByIdAndUpdate(productId, { stock: productStock[productId] }, { new: true })
    );

    await Promise.all(productUpdates);
    console.log("✅ Product stock đã được cập nhật.");

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ⏰ Lên lịch chạy JobTracker
const scheduleInventoryJob = () => {
  scheduleJob("* * * * *", async () => {
    await InventoryJob();
  });
};

export { InventoryJob , scheduleInventoryJob };
