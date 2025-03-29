import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        warehouse: {  // Thêm trường warehouse cho từng sản phẩm
          type: mongoose.Schema.Types.ObjectId,
          ref: "Warehouse",
          default: null,
        },
      },
    ],
    totalAmount: { type: Number, required: true },
    shippingInfo: {
      name: { type: String },
      address: {
        street: { type: String },
        ward: { type: String },
        district: { type: String },
        city: { type: String },
        country: { type: String },
      },
      phone: { type: String },
    },
    status: {
      type: String,
      default: "Đang xử lí",
      enum: ["Đang xử lí", "Đang giao", "Đã giao", "Đã hủy"],
      index: true,
    },
  },
  { timestamps: true }
);


const Order = mongoose.model("Order", orderSchema);

export default Order;