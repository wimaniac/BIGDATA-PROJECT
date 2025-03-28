import Order from "../models/Order.js";
import RevenueReport from "../models/RevenueReport.js";
import { scheduleJob } from "node-schedule";

const calculateRevenueByTime = async (period = "month") => {
  console.log(`Bắt đầu job tính doanh thu theo ${period}...`);
  try {
    const orders = await Order.find({ status: "Đã giao" })
      .populate("products.product", "price")
      .lean();

    if (!orders || orders.length === 0) {
      console.log("Không có đơn hàng nào đã giao!");
      return;
    }

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

    const combinedData = mappedData.reduce((acc, { key, value }) => {
      acc[key] = (acc[key] || 0) + value;
      return acc;
    }, {});

    const revenueByTime = Object.entries(combinedData)
      .map(([time, revenue]) => ({
        time,
        revenue,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    await RevenueReport.create({ type: "time", period, data: revenueByTime });
    console.log(`Đã lưu báo cáo doanh thu theo ${period} vào database.`);
  } catch (err) {
    console.error(`Lỗi trong job tính doanh thu theo ${period}:`, err.stack);
  }
};

// Lập lịch chạy job mỗi 1 phút với hàm đúng
scheduleJob("* * * * *", () => calculateRevenueByTime("month"));

export default calculateRevenueByTime;