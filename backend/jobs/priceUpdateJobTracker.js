import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";

// Supplier Price Mapper
// Mục tiêu: Trích xuất giá sản phẩm từ nhà cung cấp.
async function supplierPriceMapper() {
  const suppliers = await Supplier.find();
  const supplierPriceMap = new Map();

  // Duyệt qua từng nhà cung cấp và lưu giá sản phẩm vào map
  suppliers.forEach(supplier => {
    supplier.products.forEach(product => {
      supplierPriceMap.set(product.productId.toString(), product.price);
    });
  });

  return supplierPriceMap;
}

// Product Info Mapper
// Mục tiêu: Trích xuất thông tin sản phẩm hiện tại.
async function productInfoMapper() {
  const products = await Product.find();
  const productMap = new Map();

  // Duyệt qua từng sản phẩm và lưu thông tin vào map
  products.forEach(product => {
    productMap.set(product._id.toString(), {
      price: product.price,
      supplier: product.supplier,
    });
  });

  return productMap;
}

// Price Update Reducer
// Chức năng: Kết hợp thông tin từ cả 2 Mapper trên và cập nhật giá sản phẩm
async function priceUpdateReducer(supplierPriceMap, productMap) {
  for (const [productId, supplierPrice] of supplierPriceMap.entries()) {
    const productInfo = productMap.get(productId);

    if (productInfo && productInfo.price !== supplierPrice) {
      await Product.updateOne(
        { _id: productId },
        { $set: { price: supplierPrice } }
      );
    }
  }
}

// Main function to run the job tracker
// Hàm chính để chạy job tracker
async function runPriceUpdateJobTracker() {
  const supplierPriceMap = await supplierPriceMapper();
  const productMap = await productInfoMapper();

  await priceUpdateReducer(supplierPriceMap, productMap);
}

// Execute the job tracker
// Thực thi job tracker
runPriceUpdateJobTracker().catch(console.error);
