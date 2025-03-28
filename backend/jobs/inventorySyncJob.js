import Inventory from "../models/Inventory.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";
import { scheduleJob } from "node-schedule";

// Hàm đồng bộ tồn kho
const syncInventory = async () => {
    console.log("Bắt đầu job đồng bộ tồn kho...");
    try {
      const products = await Product.find().lean();
      for (const product of products) {
        const totalStock = await Inventory.aggregate([
          { $match: { product: new mongoose.Types.ObjectId(product._id) } },
          { $group: { _id: "$product", total: { $sum: "$quantity" } } }
        ]);
        const newStock = totalStock[0]?.total || 0;
        if (newStock !== product.stock) {
          await Product.findByIdAndUpdate(product._id, { stock: newStock });
          console.log(`Đã đồng bộ stock cho sản phẩm ${product.name}: ${product.stock} -> ${newStock}`);
        }
      }
      console.log("Hoàn tất đồng bộ tồn kho.");
    } catch (err) {
      console.error("Lỗi trong job đồng bộ tồn kho:", err.stack);
    }
};

// Lập lịch chạy job mỗi 30 phút
//* * * * * *
//| | | | | |
//| | | | | +---- Thứ trong tuần (0-6, 0 là Chủ nhật, không bắt buộc)
//| | | | +------ Tháng (1-12)
//| | | +-------- Ngày trong tháng (1-31)
//| | +---------- Giờ (0-23)
//| +------------ Phút (0-59)
//+-------------- Giây (0-59, không bắt buộc, tùy phiên bản)
//scheduleJob("*/10 * * * * *", syncInventory); // Chạy mỗi 10 giây
//scheduleJob("*/15 * * * * *", syncInventory); // Chạy mỗi 15 giây
//scheduleJob("*/1 * * * *", syncInventory); // Chạy mỗi 1 phút
//scheduleJob("*/2 * * * *", syncInventory); // Chạy mỗi 2 phút
//scheduleJob("*/5 * * * *", syncInventory); // Chạy mỗi 5 phút

scheduleJob("* * * * *", syncInventory);

export default syncInventory;