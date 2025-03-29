import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { scheduleJob } from "node-schedule";

// Thu thập dữ liệu (InputFormat)
const DataCollector = async () => {
  // Lấy đơn hàng đã giao
  const orders = await Order.find({ status: "Đã giao" })
    .populate({
      path: "products.product",
      select: "name price parentCategory subCategory",
      populate: { path: "parentCategory subCategory", select: "name" },
    })
    .lean();

  // Lấy sản phẩm mới (trong 30 ngày gần nhất)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newProducts = await Product.find({ createdAt: { $gte: thirtyDaysAgo } })
    .populate("parentCategory subCategory", "name")
    .lean();

  console.log("Đơn hàng đã thu thập:", JSON.stringify(orders, null, 2));
  console.log("Sản phẩm mới:", JSON.stringify(newProducts, null, 2));

  return { orders, newProducts };
};

// Map Function
const mapFunction = ({ orders, newProducts }) => {
  const keyValuePairs = [];

  // Map cho sản phẩm bán chạy (từ orders)
  orders.forEach(order => {
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

  // Map cho sản phẩm mới (từ newProducts)
  newProducts.forEach(product => {
    const productId = product._id.toString();
    keyValuePairs.push({
      key: "newProduct",
      value: {
        productId,
        productName: product.name,
        createdAt: product.createdAt,
        category: product.subCategory || product.parentCategory,
      },
    });
  });

  return keyValuePairs;
};

// Partition Function
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

// Map Phase
const MapPhase = async () => {
  const { orders, newProducts } = await DataCollector();
  const keyValuePairs = mapFunction({ orders, newProducts });
  const partitionedData = partitionFunction(keyValuePairs);
  return partitionedData;
};

// Sort Function
const sortFunction = (partitionedData) => {
  const sortedData = { topSelling: [], newProducts: [] };

  for (const key in partitionedData) {
    if (key.startsWith("topSelling:")) {
      sortedData.topSelling.push({ key, values: partitionedData[key] });
    } else if (key === "newProduct") {
      sortedData.newProducts.push({ key, values: partitionedData[key] });
    }
  }

  // Sắp xếp sản phẩm mới theo createdAt (mới nhất trước)
  sortedData.newProducts.forEach(item => {
    item.values.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  return sortedData;
};

// Reduce Function
const reduceFunction = (sortedData) => {
  const reducedData = { topSelling: [], newProducts: [] };

  // Xử lý sản phẩm bán chạy
  sortedData.topSelling.forEach(({ key, values }) => {
    const [_, productId] = key.split(":");
    const totalQuantity = values.reduce((sum, { quantity }) => sum + quantity, 0);
    const productName = values[0].productName;

    reducedData.topSelling.push({
      productId,
      productName,
      totalQuantity,
    });
  });

  // Sắp xếp sản phẩm bán chạy theo totalQuantity (giảm dần)
  reducedData.topSelling.sort((a, b) => b.totalQuantity - a.totalQuantity);

  // Lấy top 10 sản phẩm bán chạy
  reducedData.topSelling = reducedData.topSelling.slice(0, 10);

  // Xử lý sản phẩm mới
  sortedData.newProducts.forEach(({ values }) => {
    reducedData.newProducts = values.map(item => ({
      productId: item.productId,
      productName: item.productName,
      createdAt: item.createdAt,
      categoryName: item.category ? item.category.name : "Không xác định",
    }));
  });

  return reducedData;
};

// OutputFormat: Cập nhật popularityRank vào Product và trả về sản phẩm mới
const OutputFormat = async ({ topSelling, newProducts }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Reset popularityRank cho tất cả sản phẩm
    await Product.updateMany({}, { $set: { popularityRank: 0 } }, { session });

    // Cập nhật popularityRank cho top 10 sản phẩm bán chạy
    const bulkOperations = topSelling.map((product, index) => ({
      updateOne: {
        filter: { _id: product.productId },
        update: { $set: { popularityRank: index + 1 } },
      },
    }));

    if (bulkOperations.length > 0) {
      await Product.bulkWrite(bulkOperations, { session });
    }

    await session.commitTransaction();
    console.log("✅ Đã cập nhật sản phẩm bán chạy!");
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Lỗi trong OutputFormat:", error);
    throw error;
  } finally {
    session.endSession();
  }

  // Trả về kết quả (không lưu sản phẩm mới)
  return { topSelling, newProducts };
};

// Reduce Phase
const ReducePhase = async (intermediateData) => {
  const sortedData = sortFunction(intermediateData);
  const reducedData = reduceFunction(sortedData);
  const result = await OutputFormat(reducedData);
  return result;
};

// Job Tracker
const ProductJob = async () => {
  console.log("🔄 JobTracker sản phẩm bắt đầu...");
  try {
    const intermediateData = await MapPhase();
    const result = await ReducePhase(intermediateData);
    console.log("✅ ProductJob sản phẩm hoàn tất!");
    return result; // Trả về kết quả để sử dụng (nếu cần)
  } catch (error) {
    console.error("❌ Lỗi trong JobTracker sản phẩm:", error);
    throw error;
  }
};

// Lên lịch JobTracker
const scheduleProductJob = () => {
  scheduleJob("* * * * *", async () => {
    await ProductJob();
  });
};

export { ProductJob, scheduleProductJob };