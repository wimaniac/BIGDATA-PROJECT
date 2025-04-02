import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { scheduleJob } from "node-schedule";

// **InputFormat: Thu thập dữ liệu từ "DFS" (MongoDB)**
const InputFormat = async () => {
  const orders = await Order.find({ status: "Đã giao" })
    .populate({
      path: "products.product",
      select: "name price parentCategory subCategory",
      populate: { path: "parentCategory subCategory", select: "name" },
    })
    .lean();

  const products = await Product.find()
    .populate("parentCategory", "name")
    .populate("subCategory", "name")
    .lean();

  return { orders, products };
};

// **Map Phase cho Products (TaskTracker M1)**
const MapPhaseProducts = async (products) => {
  // Map: Ánh xạ dữ liệu thành key-value pairs
  const keyValuePairs = [];
  products.forEach((product) => {
    const productId = product._id.toString();
    keyValuePairs.push({
      key: productId, // Bỏ tiền tố topSelling
      value: {
        productId,
        productName: product.name,
        price: product.price,
        description: product.description,
        parentCategory: product.parentCategory?.name || "Không có danh mục cha",
        subCategory: product.subCategory?.name || "Không có danh mục con",
        stock: product.stock,
        totalSold: product.totalSold,
      },
    });
  });

  // Partition: Nhóm dữ liệu theo key
  const partitionedData = {};
  keyValuePairs.forEach(({ key, value }) => {
    if (!partitionedData[key]) {
      partitionedData[key] = [];
    }
    partitionedData[key].push(value);
  });

  // Region: Chọn sản phẩm đầu tiên cho mỗi key (sản phẩm duy nhất)
  const regionProducts = {};
  for (const key in partitionedData) {
    regionProducts[key] = partitionedData[key][0];
  }
  return regionProducts;
};

// **Map Phase cho Orders (TaskTracker M2)**
const MapPhaseOrders = async (orders) => {
  // Map: Ánh xạ dữ liệu thành key-value pairs
  const keyValuePairs = [];
  orders.forEach((order) => {
    order.products.forEach(({ product, quantity }) => {
      if (!product) {
        console.warn("Sản phẩm không tồn tại trong đơn hàng:", order._id);
        return;
      }

      const productId = product._id.toString();
      keyValuePairs.push({
        key: productId, // Bỏ tiền tố topSelling
        value: { productId, productName: product.name, quantity },
      });
    });
  });

  // Partition: Nhóm dữ liệu theo key
  const partitionedData = {};
  keyValuePairs.forEach(({ key, value }) => {
    if (!partitionedData[key]) {
      partitionedData[key] = [];
    }
    partitionedData[key].push(value);
  });

  // Combine: Tính tổng số lượng cho mỗi sản phẩm theo key
  const regionOrders = {};
  for (const key in partitionedData) {
    const values = partitionedData[key];
    const totalQuantity = values.reduce((sum, { quantity }) => sum + quantity, 0);
    const productName = values[0].productName;
    const productId = values[0].productId;

    regionOrders[key] = {
      productId,
      productName,
      totalQuantity,
    };
  }

  return regionOrders;
};

// **Reduce Phase: Tính top 10 sản phẩm bán chạy (TaskTracker R1)**
const ReducePhaseTopSelling = async ({ regionOrders, regionProducts }) => {
  // Sort: Sắp xếp dữ liệu theo totalQuantity
  const sortedData = { topSelling: [] };
  for (const key in regionOrders) {
    sortedData.topSelling.push(regionOrders[key]); // Bỏ bước lọc key vì không còn tiền tố topSelling
  }
  sortedData.topSelling.sort((a, b) => b.totalQuantity - a.totalQuantity);

  // Reduce: Lấy top 10 sản phẩm và kết hợp thông tin từ regionProducts
  const topSelling = sortedData.topSelling.slice(0, 10).map((item) => {
    const key = item.productId; // Key giờ chỉ là productId
    const productInfo = regionProducts[key] || {};
    return {
      productId: item.productId,
      productName: item.productName,
      totalQuantity: item.totalQuantity,
      price: productInfo.price || 0,
      description: productInfo.description || "",
      parentCategory: productInfo.parentCategory || "Không có danh mục cha",
      subCategory: productInfo.subCategory || "Không có danh mục con",
      stock: productInfo.stock || 0,
      totalSold: productInfo.totalSold || 0,
    };
  });

  return { topSelling };
};

// **OutputFormat: Ghi kết quả cuối cùng vào "DFS" (cập nhật MongoDB)**
const OutputFormat = async ({ topSelling }) => {
  try {
    // Reset popularityRank cho tất cả sản phẩm
    await Product.updateMany({}, { $set: { popularityRank: 0 } });

    // Cập nhật popularityRank cho top 10 sản phẩm bán chạy
    const bulkOperations = topSelling.map((product, index) => ({
      updateOne: {
        filter: { _id: product.productId },
        update: { $set: { popularityRank: index + 1 } },
      },
    }));

    if (bulkOperations.length > 0) {
      await Product.bulkWrite(bulkOperations);
    }

    console.log("✅ Đã cập nhật sản phẩm bán chạy!");
    console.log("Top 10 sản phẩm bán chạy:");
    topSelling.forEach((product, index) => {
      console.log(
        `${index + 1}. ${product.productName} (ID: ${product.productId}) - Tổng số lượng: ${product.totalQuantity}, Giá: ${product.price}, Mô tả: ${product.description}, Danh mục: ${product.parentCategory}/${product.subCategory}, Tồn kho: ${product.stock}, Đã bán: ${product.totalSold}`
      );
    });

    return topSelling;
  } catch (error) {
    console.error("❌ Lỗi trong OutputFormat:", error);
    throw error;
  }
};

// **Job Tracker: Điều phối toàn bộ luồng**
const ProductJob = async () => {
  console.log("🔄 JobTracker sản phẩm bán chạy bắt đầu...");
  try {
    // InputFormat
    const { orders, products } = await InputFormat();

    // Map Phase
    const regionOrders = await MapPhaseOrders(orders);
    const regionProducts = await MapPhaseProducts(products);

    // Reduce Phase
    const reducedData = await ReducePhaseTopSelling({ regionOrders, regionProducts });

    // Output Phase
    const result = await OutputFormat(reducedData);

    console.log("✅ ProductJob sản phẩm bán chạy hoàn tất!");
    return result;
  } catch (error) {
    console.error("❌ Lỗi trong JobTracker sản phẩm bán chạy:", error);
    throw error;
  }
};

// **Lên lịch chạy JobTracker**
const scheduleProductJob = () => {
  scheduleJob("* * * * *", async () => {
    await ProductJob();
  });
};

export { ProductJob, scheduleProductJob };