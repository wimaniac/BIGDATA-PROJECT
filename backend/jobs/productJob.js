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

  return orders;
};

// **Map Function: Ánh xạ dữ liệu thành key-value pairs**
const mapFunction = (orders) => {
  const keyValuePairs = [];

  // TaskTracker M1: Xử lý Orders để tính sản phẩm bán chạy
  orders.forEach((order) => {
    order.products.forEach(({ product, quantity }) => {
      if (!product) {
        console.warn("Sản phẩm không tồn tại trong đơn hàng:", order._id);
        return;
      }

      const productId = product._id.toString();
      keyValuePairs.push({
        key: `topSelling:${productId}`,
        value: { productId, productName: product.name, quantity },
      });
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
    const values = partitionedData[key];
    const totalQuantity = values.reduce((sum, { quantity }) => sum + quantity, 0);
    const productName = values[0].productName;
    const productId = values[0].productId;

    combinedData[key] = {
      productId,
      productName,
      totalQuantity,
    };
  }

  return combinedData;
};

// **Map Phase: Thực hiện InputFormat, map(), partition(), combine()**
const MapPhase = async () => {
  // InputFormat: Lấy dữ liệu từ "DFS"
  const orders = await InputFormat();

  // TaskTracker M1: Ánh xạ dữ liệu
  const keyValuePairs = mapFunction(orders);

  // Partition: Nhóm dữ liệu
  const partitionedData = partitionFunction(keyValuePairs);

  // Combine: Tổng hợp dữ liệu trong RAM
  const combinedData = combineFunction(partitionedData);

  // Lưu kết quả trung gian vào "DFS" (ở đây chỉ mô phỏng, trả về dữ liệu)
  return combinedData;
};

// **Sort Function: Sắp xếp dữ liệu trước khi reduce**
const sortFunction = (combinedData) => {
  const sortedData = { topSelling: [] };

  for (const key in combinedData) {
    if (key.startsWith("topSelling:")) {
      sortedData.topSelling.push(combinedData[key]);
    }
  }

  // Sắp xếp theo totalQuantity (giảm dần)
  sortedData.topSelling.sort((a, b) => b.totalQuantity - a.totalQuantity);

  return sortedData;
};

// **Reduce Function: Xử lý dữ liệu đã được tổng hợp**
const reduceFunction = (sortedData) => {
  // Lấy top 10 sản phẩm bán chạy
  const topSelling = sortedData.topSelling.slice(0, 10);
  return { topSelling };
};

// **Reduce Phase: Đọc dữ liệu từ "DFS", sort, reduce**
const ReducePhase = async (intermediateData) => {
  // Đọc dữ liệu từ "DFS" (ở đây là intermediateData đã được lưu từ Map Phase)
  const sortedData = sortFunction(intermediateData);

  // TaskTracker R1: Thực hiện reduce
  const reducedData = reduceFunction(sortedData);

  return reducedData;
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
    // Map Phase
    const intermediateData = await MapPhase();

    // Reduce Phase
    const reducedData = await ReducePhase(intermediateData);

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
    // Chạy mỗi ngày lúc 00:00
    await ProductJob();
  });
};

export { ProductJob, scheduleProductJob };