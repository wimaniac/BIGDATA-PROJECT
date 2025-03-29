import mongoose from "mongoose";
import Order from "../models/Order.js";
import RevenueReport from "../models/RevenueReport.js";
import { scheduleJob } from "node-schedule";

// Thu thập dữ liệu từ đơn hàng (InputFormat)
const OrderCollector = async () => {
  const orders = await Order.find({ status: "Đã giao" })
    .populate({
      path: "products.product",
      select: "name price parentCategory subCategory",
      populate: { path: "parentCategory subCategory", select: "name" },
    })
    .lean();
  console.log("Đơn hàng đã thu thập:", JSON.stringify(orders, null, 2));
  return orders;
};

// Map Function
const mapFunction = (order) => {
  const keyValuePairs = [];

  order.products.forEach(({ product, quantity }) => {
    if (!product) {
      console.warn("Sản phẩm không tồn tại trong đơn hàng:", order._id);
      return;
    }

    const revenue = product.price * quantity;
    const category = product.subCategory || product.parentCategory;
    if (!category || !category._id) {
      console.warn("Sản phẩm không có danh mục hợp lệ:", product);
      return;
    }

    const categoryId = category._id.toString();
    const dayKey = order.createdAt.toISOString().slice(0, 10);
    const monthKey = order.createdAt.toISOString().slice(0, 7);
    const yearKey = order.createdAt.toISOString().slice(0, 4);

    keyValuePairs.push({
      key: `category:${categoryId}`,
      value: { productId: product._id.toString(), productName: product.name, quantity, revenue, categoryName: category.name },
    });

    keyValuePairs.push({ key: `day:${dayKey}`, value: { revenue } });
    keyValuePairs.push({ key: `month:${monthKey}`, value: { revenue } });
    keyValuePairs.push({ key: `year:${yearKey}`, value: { revenue } });
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

// Map Phase (Task Tracker M1, M2, M3)
const MapPhase = async (orders) => {
  const keyValuePairs = orders.flatMap(order => mapFunction(order));
  const partitionedData = partitionFunction(keyValuePairs);
  return partitionedData; // Trả về dữ liệu trung gian (Region1, Region2)
};

// Sort Function
const sortFunction = (partitionedData) => {
  const sortedData = { category: [], time: { day: [], month: [], year: [] } };

  for (const key in partitionedData) {
    const [type, id] = key.split(":");
    if (type === "category") {
      sortedData.category.push({ key, values: partitionedData[key] });
    } else {
      const period = type;
      sortedData.time[period].push({ key, values: partitionedData[key] });
    }
  }

  // Sắp xếp dữ liệu thời gian theo thời gian
  ["day", "month", "year"].forEach(period => {
    sortedData.time[period].sort((a, b) => a.key.localeCompare(b.key));
  });

  return sortedData;
};

// Reduce Function (Tổng hợp dữ liệu)
const reduceFunction = (sortedData) => {
  const reducedData = { category: [], time: { day: [], month: [], year: [] } };

  // Xử lý dữ liệu theo danh mục
  sortedData.category.forEach(({ key, values }) => {
    const [_, categoryId] = key.split(":");
    const result = {
      categoryId,
      categoryName: values[0].categoryName || "Danh mục không xác định",
      totalSoldItems: 0,
      totalRevenue: 0,
      products: {},
    };

    values.forEach(({ productId, productName, quantity, revenue }) => {
      result.totalSoldItems += quantity;
      result.totalRevenue += revenue;

      if (!result.products[productId]) {
        result.products[productId] = {
          productName: productName || "Sản phẩm không xác định",
          quantity: 0,
          revenue: 0,
        };
      }
      result.products[productId].quantity += quantity;
      result.products[productId].revenue += revenue;
    });

    result.products = Object.values(result.products);
    reducedData.category.push(result);
  });

  // Xử lý dữ liệu theo thời gian
  ["day", "month", "year"].forEach(period => {
    sortedData.time[period].forEach(({ key, values }) => {
      const [_, time] = key.split(":");
      const totalRevenue = values.reduce((sum, { revenue }) => sum + revenue, 0);
      reducedData.time[period].push({ time, revenue: totalRevenue });
    });
  });

  return reducedData;
};

// OutputFormat
const OutputFormat = async ({ category, time }) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const bulkOperations = [
      {
        updateOne: {
          filter: { type: "category" },
          update: { $set: { data: category } },
          upsert: true,
        },
      },
      ...["day", "month", "year"].map((period) => ({
        updateOne: {
          filter: { type: "time", period },
          update: { $set: { data: time[period] } },
          upsert: true,
        },
      })),
    ];
    await RevenueReport.bulkWrite(bulkOperations, { session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Lỗi trong OutputFormat:", error);
    throw error;
  } finally {
    session.endSession();
  }
};

// Reduce Phase (Task Tracker R1, R2)
const ReducePhase = async (intermediateData) => {
  const sortedData = sortFunction(intermediateData);
  const reducedData = reduceFunction(sortedData);
  await OutputFormat(reducedData);
};

// Job Tracker
const RevenueJob = async () => {
  console.log("🔄 JobTracker doanh thu bắt đầu...");
  try {
    const orders = await OrderCollector();
    const intermediateData = await MapPhase(orders);
    await ReducePhase(intermediateData);
    console.log("✅ JobTracker doanh thu hoàn tất!");
  } catch (error) {
    console.error("❌ Lỗi trong JobTracker doanh thu:", error);
    throw error;
  }
};

// Lên lịch JobTracker
const scheduleRevenueJob = () => {
  scheduleJob("0 0 * * *", async () => {
    await RevenueJob();
  });
};

export { RevenueJob, scheduleRevenueJob };