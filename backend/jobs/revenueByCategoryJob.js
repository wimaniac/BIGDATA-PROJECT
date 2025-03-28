import mongoose from "mongoose";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import RevenueReport from "../models/RevenueReport.js";
import { scheduleJob } from "node-schedule";

const calculateRevenueByCategory = async () => {
  console.log("Bắt đầu job tính doanh thu theo danh mục...");
  try {
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

    const mappedData = orders.flatMap((order) => {
      if (!order.products || !Array.isArray(order.products)) {
        console.warn(`Đơn hàng ${order._id} không có sản phẩm hợp lệ`);
        return [];
      }
      return order.products.map((item) => {
        const product = item.product;
        if (!product || !product.price || !product.parentCategory) {
          console.warn(`Sản phẩm trong đơn hàng ${order._id} không hợp lệ:`, item);
          return { key: "unknown", value: { quantity: item.quantity, revenue: 0, productName: "Unknown" } };
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

    const combinedData = mappedData.reduce((acc, { key, value }) => {
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
          products: Object.values(data.products),
        };
      })
    );

    // Lưu vào database
    await RevenueReport.create({ type: "category", data: categoryRevenues });
    console.log("Đã lưu báo cáo doanh thu theo danh mục vào database.");
  } catch (err) {
    console.error("Lỗi trong job tính doanh thu theo danh mục:", err.stack);
  }
};

// Lập lịch chạy job mỗi 1 phút với hàm đúng
scheduleJob("* * * * *", calculateRevenueByCategory);

export default calculateRevenueByCategory;