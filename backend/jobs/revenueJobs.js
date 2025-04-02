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

// Region Function: Lưu trữ dữ liệu trung gian vào các Region
const regionFunction = (partitionedData) => {
  const regions = {
    region1: {}, // Dữ liệu cho category
    region2: {}  // Dữ liệu cho time (day, month, year)
  };

  // Phân chia dữ liệu vào các Region
  for (const key in partitionedData) {
    const [type, id] = key.split(":");
    if (type === "category") {
      regions.region1[key] = partitionedData[key];
    } else {
      regions.region2[key] = partitionedData[key];
    }
  }

  // Mô phỏng việc lưu trữ vào RAM (trong thực tế, có thể lưu vào file hoặc cơ chế lưu trữ tạm thời)
  console.log("Storing data into Regions...");
  console.log("Region1 (category):", regions.region1);
  console.log("Region2 (time):", regions.region2);

  return regions;
};

// Map Phase
const MapPhase = async (orders) => {
  const keyValuePairs = orders.flatMap(order => mapFunction(order));
  const partitionedData = partitionFunction(keyValuePairs);
  const regions = regionFunction(partitionedData); // Thêm bước Region
  return regions;
};

// Reduce Function for Category (TaskTracker R1)
const reduceCategory = (region1) => {
  const result = [];

  // Reduce trực tiếp trên region1 mà không cần bước Sort
  for (const key in region1) {
    const [type, categoryId] = key.split(":");
    if (type !== "category") continue; // Đảm bảo chỉ xử lý các key liên quan đến category

    const values = region1[key];
    const categoryResult = {
      categoryId,
      categoryName: values[0].categoryName || "Danh mục không xác định",
      totalSoldItems: 0,
      totalRevenue: 0,
      products: {},
    };

    values.forEach(({ productId, productName, quantity, revenue }) => {
      categoryResult.totalSoldItems += quantity;
      categoryResult.totalRevenue += revenue;

      if (!categoryResult.products[productId]) {
        categoryResult.products[productId] = {
          productName: productName || "Sản phẩm không xác định",
          quantity: 0,
          revenue: 0,
        };
      }
      categoryResult.products[productId].quantity += quantity;
      categoryResult.products[productId].revenue += revenue;
    });

    categoryResult.products = Object.values(categoryResult.products);
    result.push(categoryResult);
  }

  return result;
};

// Reduce Function for Time (TaskTracker R2)
const reduceTime = (region2) => {
  // Sort: Tạo và sắp xếp dữ liệu thời gian
  const timeData = { day: [], month: [], year: [] };
  for (const key in region2) {
    const [type, id] = key.split(":");
    if (type !== "category") {
      const period = type;
      timeData[period].push({ key, values: region2[key] });
    }
  }

  // Sắp xếp dữ liệu thời gian theo thời gian
  ["day", "month", "year"].forEach(period => {
    timeData[period].sort((a, b) => a.key.localeCompare(b.key));
  });

  // Reduce: Tổng hợp dữ liệu theo thời gian
  const result = { day: [], month: [], year: [] };
  ["day", "month", "year"].forEach(period => {
    timeData[period].forEach(({ key, values }) => {
      const [_, time] = key.split(":");
      const totalRevenue = values.reduce((sum, { revenue }) => sum + revenue, 0);
      result[period].push({ time, revenue: totalRevenue });
    });
  });

  return result;
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

// Reduce Phase
const ReducePhase = async (regions) => {
  // TaskTracker R1: Xử lý dữ liệu category từ Region1
  const reducedCategory = reduceCategory(regions.region1);

  // TaskTracker R2: Xử lý dữ liệu time từ Region2
  const reducedTime = reduceTime(regions.region2);

  // Ghi kết quả ra MongoDB
  await OutputFormat({ category: reducedCategory, time: reducedTime });
};

// Job Tracker
const RevenueJob = async () => {
  console.log("🔄 JobTracker doanh thu bắt đầu...");
  try {
    const orders = await OrderCollector();
    const regions = await MapPhase(orders); // MapPhase trả về regions
    await ReducePhase(regions); // ReducePhase nhận regions
    console.log("✅ JobTracker doanh thu hoàn tất!");
  } catch (error) {
    console.error("❌ Lỗi trong JobTracker doanh thu:", error);
    throw error;
  }
};

// Lên lịch JobTracker
const scheduleRevenueJob = () => {
  scheduleJob("* * * * *", async () => {
    await RevenueJob();
  });
};

export { RevenueJob, scheduleRevenueJob };