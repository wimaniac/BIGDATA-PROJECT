import mongoose from "mongoose";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import RevenueReport from "../models/RevenueReport.js";
import { scheduleJob } from "node-schedule";

// Tính doanh thu theo danh mục
const calculateRevenueByCategory = async () => {
  console.log("Bắt đầu job tính doanh thu theo danh mục...");
  try {
    // Lấy dữ liệu đầu vào: tất cả đơn hàng đã giao
    const orders = await Order.find({ status: "Đã giao" })
      .populate({
        path: "products.product",
        select: "name price parentCategory",
        populate: { path: "parentCategory", select: "name" },
      })
      .lean();

    if (!orders || orders.length === 0) {
      console.log("Không có đơn hàng nào đã giao!");
      return;
    }

    // Giai đoạn MAP: Ánh xạ từng đơn hàng thành các cặp key-value
    // - Key: categoryId (ID danh mục)
    // - Value: { quantity, revenue, productName, productId }
    const mappedData = orders.flatMap((order) => {
      if (!order.products || !Array.isArray(order.products)) {
        console.warn(`Đơn hàng ${order._id} không có sản phẩm hợp lệ`);
        return [];
      }
      return order.products.map((item) => {
        const product = item.product;
        if (!product || !product.price || !product.parentCategory) {
          console.warn(`Sản phẩm trong đơn hàng ${order._id} không hợp lệ:`, item);
          return {
            key: "unknown",
            value: { quantity: item.quantity, revenue: 0, productName: "Unknown" },
          };
        }
        return {
          key: product.parentCategory._id.toString(),
          value: {
            quantity: item.quantity,
            revenue: item.quantity * product.price,
            productName: product.name,
            productId: product._id.toString(),
          },
        };
      });
    });

    // Giai đoạn PARTITION (ngầm định): 
    // - Trong hệ thống phân tán, mappedData sẽ được chia thành các partitions dựa trên key (categoryId)
    // - Ở đây, vì không phân tán, toàn bộ mappedData được xử lý trong một luồng, nên không cần partition rõ ràng

    // Giai đoạn COMBINE (ngầm định):
    // - Trong hệ thống phân tán, có thể thực hiện một bước tổng hợp sơ bộ trên từng node trước khi gửi đến reducer
    // - Code hiện tại không có Combine riêng, nhưng bước Reduce dưới đây kiêm luôn vai trò này

    // Giai đoạn REDUCE: Tổng hợp dữ liệu theo key (categoryId)
    // - Region (Kết quả tạm thời): combinedData là tập hợp các kết quả tạm thời cho mỗi danh mục
    const combinedData = mappedData.reduce((acc, { key, value }) => {
      // Khởi tạo nếu danh mục chưa tồn tại
      if (!acc[key]) {
        acc[key] = {
          totalRevenue: 0,
          totalSoldItems: 0,
          products: {},
        };
      }
      // Cộng dồn doanh thu và số lượng bán
      acc[key].totalRevenue += value.revenue;
      acc[key].totalSoldItems += value.quantity;
      // Tổng hợp chi tiết sản phẩm theo productId
      if (!acc[key].products[value.productId]) {
        acc[key].products[value.productId] = {
          productName: value.productName,
          quantity: 0,
          revenue: 0,
        };
      }
      acc[key].products[value.productId].quantity += value.quantity;
      acc[key].products[value.productId].revenue += value.revenue;
      return acc;
    }, {});

    // Giai đoạn FINALIZE: Hoàn thiện dữ liệu bằng cách thêm tên danh mục và định dạng
    const categoryRevenues = await Promise.all(
      Object.entries(combinedData).map(async ([categoryId, data]) => {
        let categoryName = "Unknown";
        try {
          const category = await Category.findById(categoryId);
          categoryName = category ? category.name : "Unknown";
        } catch (err) {
          console.error(`Lỗi khi lấy danh mục ${categoryId}:`, err.message);
        }
        return {
          categoryId,
          categoryName,
          totalRevenue: data.totalRevenue,
          totalSoldItems: data.totalSoldItems,
          products: Object.values(data.products), // Chuyển từ object sang array
        };
      })
    );

    // Lưu kết quả cuối cùng vào database
    await RevenueReport.create({ type: "category", data: categoryRevenues });
    console.log("Đã lưu báo cáo doanh thu theo danh mục vào database.");
  } catch (err) {
    console.error("Lỗi trong job tính doanh thu theo danh mục:", err.stack);
  }
};

// Tính doanh thu theo thời gian
const calculateRevenueByTime = async (period = "month") => {
  console.log(`Bắt đầu job tính doanh thu theo ${period}...`);
  try {
    // Lấy dữ liệu đầu vào: tất cả đơn hàng đã giao
    const orders = await Order.find({ status: "Đã giao" })
      .populate("products.product", "price")
      .lean();

    if (!orders || orders.length === 0) {
      console.log("Không có đơn hàng nào đã giao!");
      return;
    }

    // Giai đoạn MAP: Ánh xạ từng đơn hàng thành cặp key-value
    // - Key: Thời gian (ngày/tháng/năm)
    // - Value: Doanh thu của đơn hàng
    const mappedData = orders.map((order) => {
      const date = new Date(order.createdAt);
      let key;
      if (period === "day") {
        key = date.toISOString().split("T")[0];
      } else if (period === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        key = date.getFullYear().toString();
      }
      const revenue = order.products.reduce(
        (sum, item) => sum + item.quantity * (item.product?.price || 0),
        0
      );
      return { key, value: revenue };
    });

    // Giai đoạn PARTITION (ngầm định):
    // - Trong hệ thống phân tán, mappedData sẽ được chia theo key (thời gian) để gửi đến các reducer
    // - Ở đây, không có phân tán, nên toàn bộ dữ liệu được xử lý trong một reducer

    // Giai đoạn COMBINE (ngầm định):
    // - Có thể thêm bước cộng dồn sơ bộ nếu dữ liệu lớn, nhưng hiện tại Reduce xử lý luôn

    // Giai đoạn REDUCE: Tổng hợp doanh thu theo key (thời gian)
    // - Region (Kết quả tạm thời): combinedData chứa tổng doanh thu cho mỗi khoảng thời gian
    const combinedData = mappedData.reduce((acc, { key, value }) => {
      acc[key] = (acc[key] || 0) + value; // Cộng dồn doanh thu cho cùng thời gian
      return acc;
    }, {});

    // Giai đoạn FINALIZE: Định dạng kết quả thành mảng và sắp xếp
    const revenueByTime = Object.entries(combinedData)
      .map(([time, revenue]) => ({
        time,
        revenue,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    // Lưu kết quả cuối cùng vào database
    await RevenueReport.create({ type: "time", period, data: revenueByTime });
    console.log(`Đã lưu báo cáo doanh thu theo ${period} vào database.`);
  } catch (err) {
    console.error(`Lỗi trong job tính doanh thu theo ${period}:`, err.stack);
  }
};

// Hàm chạy tất cả các job
const runRevenueJobs = async () => {
  await calculateRevenueByCategory();
  await calculateRevenueByTime("day");
  await calculateRevenueByTime("month");
  await calculateRevenueByTime("year");
};

// Lập lịch chạy job mỗi 1 phút
scheduleJob("* * * * *", runRevenueJobs);

export { calculateRevenueByCategory, calculateRevenueByTime, runRevenueJobs };