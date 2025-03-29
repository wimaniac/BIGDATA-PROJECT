import mongoose from "mongoose";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import RevenueReport from "../models/RevenueReport.js";
import { scheduleJob } from "node-schedule";

// Job tracker tổng hợp: Tính doanh thu theo danh mục và thời gian
const calculateRevenue = async () => {
  console.log("Bắt đầu job tính doanh thu tổng hợp...");
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

    // --- Xử lý doanh thu theo danh mục ---

    // Giai đoạn MAP cho danh mục: Ánh xạ thành cặp key-value theo categoryId
    const categoryMappedData = orders.flatMap((order) => {
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

    // Giai đoạn REDUCE cho danh mục: Tổng hợp theo categoryId
    const categoryCombinedData = categoryMappedData.reduce((acc, { key, value }) => {
      if (!acc[key]) {
        acc[key] = {
          totalRevenue: 0,
          totalSoldItems: 0,
          products: {},
        };
      }
      acc[key].totalRevenue += value.revenue;
      acc[key].totalSoldItems += value.quantity;
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

    // Giai đoạn FINALIZE cho danh mục: Thêm tên danh mục và định dạng
    const categoryRevenues = await Promise.all(
      Object.entries(categoryCombinedData).map(async ([categoryId, data]) => {
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
          products: Object.values(data.products),
        };
      })
    );

    // --- Xử lý doanh thu theo thời gian ---
    const periods = ["day", "month", "year"];
    const timeRevenues = {};

    for (const period of periods) {
      // Giai đoạn MAP cho thời gian: Ánh xạ theo khoảng thời gian
      const timeMappedData = orders.map((order) => {
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

      // Giai đoạn REDUCE cho thời gian: Tổng hợp theo thời gian
      const timeCombinedData = timeMappedData.reduce((acc, { key, value }) => {
        acc[key] = (acc[key] || 0) + value;
        return acc;
      }, {});

      // Giai đoạn FINALIZE cho thời gian: Định dạng và sắp xếp
      timeRevenues[period] = Object.entries(timeCombinedData)
        .map(([time, revenue]) => ({
          time,
          revenue,
        }))
        .sort((a, b) => a.time.localeCompare(b.time));
    }

    // Lưu tất cả kết quả vào database trong một lần
    await Promise.all([
      RevenueReport.create({ type: "category", data: categoryRevenues }),
      ...periods.map((period) =>
        RevenueReport.create({ type: "time", period, data: timeRevenues[period] })
      ),
    ]);

    console.log("Đã lưu toàn bộ báo cáo doanh thu vào database.");
  } catch (err) {
    console.error("Lỗi trong job tính doanh thu tổng hợp:", err.stack);
  }
};

// Lập lịch chạy job mỗi 1 phút
scheduleJob("* * * * *", calculateRevenue);

export default calculateRevenue;