import Product from "../models/Product.js";
import Category from "../models/Category.js";

// Category Hierarchy Mapper
// Mục tiêu: Trích xuất thông tin phân cấp danh mục.
async function categoryHierarchyMapper() {
  const categories = await Category.find();
  const categoryMap = new Map();

  // Duyệt qua từng danh mục và lưu thông tin phân cấp vào map
  categories.forEach(category => {
    categoryMap.set(category._id.toString(), category.parentCategory);
  });

  return categoryMap;
}

// Product Info Mapper
// Mục tiêu: Trích xuất thông tin sản phẩm hiện tại.
async function productInfoMapper() {
  const products = await Product.find();
  const productMap = new Map();

  // Duyệt qua từng sản phẩm và lưu thông tin vào map
  products.forEach(product => {
    productMap.set(product._id.toString(), {
      parentCategory: product.parentCategory,
      subCategory: product.subCategory,
    });
  });

  return productMap;
}

// Category Update Reducer
// Chức năng: Kết hợp thông tin từ cả 2 Mapper trên và cập nhật danh mục sản phẩm
async function categoryUpdateReducer(categoryMap, productMap) {
  for (const [productId, productInfo] of productMap.entries()) {
    const newParentCategory = categoryMap.get(productInfo.parentCategory.toString());

    if (newParentCategory && newParentCategory !== productInfo.parentCategory) {
      await Product.updateOne(
        { _id: productId },
        { $set: { parentCategory: newParentCategory } }
      );
    }
  }
}

// Main function to run the job tracker
// Hàm chính để chạy job tracker
async function runCategoryUpdateJobTracker() {
  const categoryMap = await categoryHierarchyMapper();
  const productMap = await productInfoMapper();

  await categoryUpdateReducer(categoryMap, productMap);
}

// Execute the job tracker
// Thực thi job tracker
runCategoryUpdateJobTracker().catch(console.error);
