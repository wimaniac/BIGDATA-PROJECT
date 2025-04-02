import mongoose from "mongoose";
import Order from "../models/Order.js";
import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";
import { scheduleJob } from "node-schedule";


// Kiểm tra lại Product.stock sau khi cập nhật
const verifyProductStock = async () => {
  const products = await Product.find().lean();
  for (const product of products) {
    const inventories = await Inventory.find({ product: product._id }).lean();
    const totalInventoryQuantity = inventories.reduce((sum, inv) => sum + inv.quantity, 0);

    if (totalInventoryQuantity !== product.stock) {
      console.error(
        `❌ Sản phẩm ${product._id} không đồng bộ sau khi cập nhật: Product.stock = ${product.stock}, Tổng Inventory.quantity = ${totalInventoryQuantity}`
      );
    }
  }
};

// **Map Phase cho Orders (TaskTracker M1)**
const MapPhaseOrders = async () => {
  const orders = await Order.find({ status: "Đã giao", processed: { $ne: true } })
    .populate("products.product", "name")
    .populate("products.warehouse", "name")
    .lean();

  console.log(`MapPhaseOrders: Tìm thấy ${orders.length} đơn hàng chưa xử lý:`);
  orders.forEach((order) => {
    console.log(`- Đơn hàng ${order._id}:`);
    order.products.forEach((item) => {
      console.log(
        `  Sản phẩm ${item.product._id} (${item.product.name}), Kho ${item.warehouse?._id || "no-warehouse"} (${item.warehouse?.name || "Không có kho"}), Số lượng: ${item.quantity}`
      );
    });
  });

  let keyValuePairs = [];
  orders.forEach((order) => {
    order.products.forEach((item) => {
      keyValuePairs.push({
        key: `${item.product._id}-${item.warehouse ? item.warehouse._id : "no-warehouse"}`,
        value: { type: "order", quantity: item.quantity, orderId: order._id },
      });
    });
  });

  const partitionedData = {};
  keyValuePairs.forEach(({ key, value }) => {
    if (!partitionedData[key]) {
      partitionedData[key] = [];
    }
    partitionedData[key].push(value);
  });

  const regionOrders = {};
  for (const key in partitionedData) {
    regionOrders[key] = { orders: partitionedData[key] };
  }

  return regionOrders;
};

// **Map Phase cho Inventory (TaskTracker M2)**
const MapPhaseInventory = async () => {
  const inventoryItems = await Inventory.find()
    .populate("product", "name stock") // Thêm "stock" để lấy Product.stock
    .populate("warehouse", "name")
    .lean();

  let keyValuePairs = [];
  let productQuantities = {}; // Lưu tổng quantity theo productId

  inventoryItems.forEach((item) => {
    const productId = item.product._id.toString();
    keyValuePairs.push({
      key: `${productId}-${item.warehouse._id}`,
      value: { type: "inventory", quantity: item.quantity, inventoryId: item._id },
    });

    // Tính tổng quantity cho mỗi productId
    if (!productQuantities[productId]) {
      productQuantities[productId] = { totalQuantity: 0, stock: item.product.stock };
    }
    productQuantities[productId].totalQuantity += item.quantity;
  });

  // Kiểm tra và đồng bộ Product.stock
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const productId in productQuantities) {
        const { totalQuantity, stock } = productQuantities[productId];
        if (totalQuantity !== stock) {
          console.warn(
            `⚠️ Sản phẩm ${productId} không đồng bộ: Product.stock = ${stock}, Tổng Inventory.quantity = ${totalQuantity}`
          );
          await Product.findByIdAndUpdate(
            productId,
            { stock: totalQuantity },
            { new: true, session }
          );
          console.log(`Đã đồng bộ Product.stock cho sản phẩm ${productId} thành ${totalQuantity}`);
        }
      }
    });
  } catch (error) {
    console.error("❌ Lỗi khi đồng bộ Product.stock trong MapPhaseInventory:", error);
    throw error;
  } finally {
    session.endSession();
  }

  const partitionedData = {};
  keyValuePairs.forEach(({ key, value }) => {
    if (!partitionedData[key]) {
      partitionedData[key] = [];
    }
    partitionedData[key].push(value);
  });

  const regionInventory = {};
  for (const key in partitionedData) {
    regionInventory[key] = { inventory: partitionedData[key][0] };
  }

  return regionInventory;
};

// **Reduce Phase 1: Tính finalQuantity cho Inventory (R1)**
const ReducePhaseInventory = async ({ regionOrders, regionInventory }) => {
  const combinedData = {};
  for (const key in regionOrders) {
    combinedData[key] = {
      orders: regionOrders[key].orders || [],
      inventory: regionInventory[key]?.inventory || null,
    };
  }
  for (const key in regionInventory) {
    if (!combinedData[key]) {
      combinedData[key] = {
        orders: [],
        inventory: regionInventory[key].inventory,
      };
    }
  }

  const sortedData = {};
  for (const key in combinedData) {
    sortedData[key] = combinedData[key];
    if (sortedData[key].orders.length > 0) {
      sortedData[key].orders.sort((a, b) => a.orderId.localeCompare(b.orderId));
    }
  }

  let regionResults = {};
  for (const key in sortedData) {
    const { orders, inventory } = sortedData[key];

    if (key.includes("-")) {
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
        orders: orders,
      };
    }
  }

  return regionResults;
};

// **Reduce Phase 2: Tính productStock cho Product (R2)**
const ReducePhaseProduct = async ({ regionInventory, regionResults }) => {
  let productStock = {};
  const products = await Product.find().lean(); // Lấy tất cả Product để so sánh
  const productMap = new Map(products.map(p => [p._id.toString(), p.stock]));

  for (const key in regionInventory) {
    const [productId, warehouseId] = key.split("-");
    const inventory = regionInventory[key].inventory;
    if (inventory) {
      const finalQuantity = regionResults[key]?.finalQuantity ?? inventory.quantity;
      if (!productStock[productId]) {
        productStock[productId] = 0;
      }
      productStock[productId] += finalQuantity;
    }
  }

  // Kiểm tra và đồng bộ Product.stock
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const productId in productStock) {
        const calculatedStock = productStock[productId];
        const currentStock = productMap.get(productId);
        if (currentStock !== undefined && calculatedStock !== currentStock) {
          console.warn(
            `⚠️ Sản phẩm ${productId} không đồng bộ: Product.stock = ${currentStock}, Tổng Inventory.quantity = ${calculatedStock}`
          );
          await Product.findByIdAndUpdate(
            productId,
            { stock: calculatedStock },
            { new: true, session }
          );
          console.log(`Đã đồng bộ Product.stock cho sản phẩm ${productId} thành ${calculatedStock}`);
        }
      }
    });
  } catch (error) {
    console.error("❌ Lỗi khi đồng bộ Product.stock trong ReducePhaseProduct:", error);
    throw error;
  } finally {
    session.endSession();
  }

  return productStock;
};

// **OutputFormat: Ghi kết quả cuối cùng vào MongoDB**
const OutputFormat = async ({ regionResults, productStock }) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Danh sách các đơn hàng không đủ hàng để đánh dấu processed
      const insufficientStockOrders = new Set();

      const inventoryUpdates = Object.keys(regionResults)
        .filter((key) => key.includes("-"))
        .map(async (key) => {
          const { inventoryId, initialQuantity, finalQuantity, productId, warehouseId, orders } = regionResults[key];

          // Nếu không đủ hàng (currentQuantity=0 và totalOrdered > 0), đánh dấu đơn hàng là lỗi
          if (initialQuantity === 0 && orders.length > 0) {
            orders.forEach((order) => {
              insufficientStockOrders.add(order.orderId);
            });
            console.log(
              `Bỏ qua cập nhật Inventory cho sản phẩm ${productId} tại kho ${warehouseId}: Không đủ hàng (initialQuantity=${initialQuantity}, totalOrdered=${orders.reduce((sum, o) => sum + o.quantity, 0)})`
            );
            return null;
          }

          // Cập nhật Inventory nếu có hàng và số lượng thay đổi
          if (inventoryId && finalQuantity !== initialQuantity && orders.length > 0) {
            console.log(`Cập nhật Inventory ${inventoryId}: quantity từ ${initialQuantity} thành ${finalQuantity}`);
            return await Inventory.findByIdAndUpdate(
              inventoryId,
              { quantity: finalQuantity, lastUpdated: Date.now() },
              { new: true, session }
            );
          } else if (!inventoryId && finalQuantity > 0) {
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
          return null;
        })
        .filter((update) => update !== null);

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

      // Đánh dấu các đơn hàng không đủ hàng là processed với trạng thái lỗi
      if (insufficientStockOrders.size > 0) {
        await Order.updateMany(
          { _id: { $in: Array.from(insufficientStockOrders) } },
          { processed: true, error: "Không đủ hàng tồn kho để xử lý đơn hàng" },
          { session }
        );
        console.log(`✅ Đã đánh dấu ${insufficientStockOrders.size} đơn hàng không đủ hàng là processed với trạng thái lỗi.`);
      }

      // Đánh dấu các đơn hàng đã xử lý thành công
      const allOrderIds = Object.values(regionResults)
        .flatMap((result) => result.orders || [])
        .map((order) => order.orderId);
      const successfulOrderIds = [...new Set(allOrderIds)].filter(
        (orderId) => !insufficientStockOrders.has(orderId)
      );

      console.log("successfulOrderIds:", successfulOrderIds);

      if (successfulOrderIds.length > 0) {
        await Order.updateMany(
          { _id: { $in: successfulOrderIds } },
          { processed: true, error: null },
          { session }
        );
        console.log(`✅ Đã đánh dấu ${successfulOrderIds.length} đơn hàng đã xử lý thành công.`);

        // Kiểm tra trạng thái processed sau khi cập nhật
        const updatedOrders = await Order.find(
          { _id: { $in: successfulOrderIds } },
          { processed: 1 }
        ).session(session);
        console.log("Trạng thái processed sau khi cập nhật:", updatedOrders);
      }

      if (successfulOrderIds.length === 0 && insufficientStockOrders.size === 0) {
        console.log("⚠️ Không có đơn hàng nào để xử lý.");
      }
    });
  } catch (error) {
    console.error("❌ Lỗi trong OutputFormat:", error);
    throw error;
  } finally {
    session.endSession();
  }
};

// JobTracker: Quản lý công việc
const InventoryJob = async () => {
  console.log("🔄 JobTracker quản lý tồn kho bắt đầu...");

  try {
    const regionOrders = await MapPhaseOrders();
    const regionInventory = await MapPhaseInventory();
    const regionResults = await ReducePhaseInventory({ regionOrders, regionInventory });
    const productStock = await ReducePhaseProduct({ regionInventory, regionResults });
    await OutputFormat({ regionResults, productStock });
    await verifyProductStock();
    console.log("✅ JobTracker hoàn tất!");
  } catch (error) {
    console.error("❌ Lỗi JobTracker:", error);
    throw error;
  }
};

// ⏰ Lên lịch chạy JobTracker
const scheduleInventoryJob = () => {
  scheduleJob("* * * *", async () => {
    await InventoryJob();
  });
};

export { InventoryJob, scheduleInventoryJob };