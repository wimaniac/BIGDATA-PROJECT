import mongoose from "mongoose";
import Order from "../models/Order.js";
import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";
import { scheduleJob } from "node-schedule";

// JobTracker: Quản lý công việc
const InventoryJob = async () => {
  console.log("🔄 JobTracker quản lý tồn kho bắt đầu...");

  try {
    // Map Phase
    const intermediateData = await MapPhase();

    // Reduce Phase
    const finalData = await ReducePhase(intermediateData);

    // Output Phase
    await OutputFormat(finalData);

    console.log("✅ JobTracker hoàn tất!");
  } catch (error) {
    console.error("❌ Lỗi JobTracker:", error);
    throw error;
  }
};

// **InputFormat: Thu thập dữ liệu từ "DFS" (các collection trong MongoDB)**
const InputFormat = async () => {
  const orders = await Order.find({ status: "Đã giao" })
    .populate("products.product", "name")
    .populate("products.warehouse", "name")
    .lean();

  const inventoryItems = await Inventory.find()
    .populate("product", "name")
    .populate("warehouse", "name")
    .lean();

  const products = await Product.find().lean();

  return { orders, inventoryItems, products };
};

// **Map Function: Ánh xạ dữ liệu thành key-value pairs**
const mapFunction = (data) => {
  const { orders, inventoryItems, products } = data;
  let keyValuePairs = [];

  // TaskTracker M1: Xử lý Orders
  orders.forEach((order) => {
    order.products.forEach((item) => {
      keyValuePairs.push({
        key: `${item.product._id}-${item.warehouse ? item.warehouse._id : "no-warehouse"}`,
        value: { type: "order", quantity: item.quantity, orderId: order._id },
      });
    });
  });

  // TaskTracker M2: Xử lý Inventory
  inventoryItems.forEach((item) => {
    keyValuePairs.push({
      key: `${item.product._id}-${item.warehouse._id}`,
      value: { type: "inventory", quantity: item.quantity, inventoryId: item._id },
    });
  });

  // TaskTracker M3: Xử lý Product
  products.forEach((product) => {
    keyValuePairs.push({
      key: `${product._id}`,
      value: { type: "product", stock: product.stock, productId: product._id },
    });
  });

  return keyValuePairs;
};

// **Partition Function: Nhóm dữ liệu theo key**
const partitionFunction = (keyValuePairs) => {
  const partitionedData = {};
  keyValuePairs.forEach(({ key, value }) => {
    if (!partitionedData[key]) {
      partitionedData[key] = [];
    }
    partitionedData[key].push(value);
  });
  return partitionedData;
};

// **Combine Function: Tổng hợp dữ liệu trong từng nhóm (trong RAM)**
const combineFunction = (partitionedData) => {
  const combinedData = {};
  for (const key in partitionedData) {
    combinedData[key] = { orders: [], inventory: null, product: null };
    partitionedData[key].forEach((value) => {
      if (value.type === "order") {
        combinedData[key].orders.push(value);
      } else if (value.type === "inventory") {
        combinedData[key].inventory = value;
      } else if (value.type === "product") {
        combinedData[key].product = value;
      }
    });
  }
  return combinedData;
};

// **Map Phase: Thực hiện InputFormat, map(), partition(), combine()**
const MapPhase = async () => {
  const inputData = await InputFormat();
  const keyValuePairs = mapFunction(inputData);
  const partitionedData = partitionFunction(keyValuePairs);
  const combinedData = combineFunction(partitionedData);
  return combinedData;
};

// **Sort Function: Sắp xếp dữ liệu trước khi reduce**
const sortFunction = (combinedData) => {
  const sortedData = {};
  for (const key in combinedData) {
    sortedData[key] = combinedData[key];
    if (sortedData[key].orders.length > 0) {
      sortedData[key].orders.sort((a, b) => a.orderId.localeCompare(b.orderId));
    }
  }
  return sortedData;
};

// **Reduce Function: Xử lý dữ liệu đã được tổng hợp**
const reduceFunction = (sortedData) => {
  let regionResults = {};
  let productStock = {};

  for (const key in sortedData) {
    const { orders, inventory, product } = sortedData[key];

    if (product) {
      regionResults[key] = {
        productId: key,
        initialStock: product.stock,
      };
    } else {
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

// **Reduce Phase: Đọc dữ liệu từ "DFS", sort, reduce**
const ReducePhase = async (intermediateData) => {
  const sortedData = sortFunction(intermediateData);
  const reducedData = reduceFunction(sortedData);
  return reducedData;
};

// **OutputFormat: Ghi kết quả cuối cùng vào "DFS" (cập nhật MongoDB)**
const OutputFormat = async (finalData) => {
  const { regionResults, productStock } = finalData;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Cập nhật Inventory
      const inventoryUpdates = Object.keys(regionResults)
        .filter((key) => key.includes("-"))
        .map(async (key) => {
          const { inventoryId, finalQuantity, productId, warehouseId } = regionResults[key];
          if (inventoryId) {
            return await Inventory.findByIdAndUpdate(
              inventoryId,
              { quantity: finalQuantity, lastUpdated: Date.now() },
              { new: true, session }
            );
          } else {
            const product = await Product.findById(productId).session(session);
            const newInventory = new Inventory({
              product: productId,
              warehouse: warehouseId === "no-warehouse" ? null : warehouseId,
              quantity: finalQuantity,
              price: product.price,
              category: product.parentCategory,
            });
            return await newInventory.save({ session });
          }
        });

      await Promise.all(inventoryUpdates);
      console.log("✅ Inventory đã được cập nhật.");

      // Cập nhật Product stock
      const productUpdates = Object.keys(productStock).map(async (productId) => {
        return await Product.findByIdAndUpdate(
          productId,
          { stock: productStock[productId] },
          { new: true, session }
        );
      });

      await Promise.all(productUpdates);
      console.log("✅ Product stock đã được cập nhật.");
    });
  } catch (error) {
    console.error("❌ Lỗi trong OutputFormat:", error);
    throw error;
  } finally {
    session.endSession();
  }
};

// ⏰ Lên lịch chạy JobTracker
const scheduleInventoryJob = () => {
  scheduleJob("* * * *", async () => {
    await InventoryJob();
  });
};

export { InventoryJob, scheduleInventoryJob };