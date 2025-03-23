import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  IconButton,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Pagination, // Import Pagination
} from "@mui/material";
import { Edit, Delete, Add, Visibility } from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Import useNavigate

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [subcategoryFilter, setSubcategoryFilter] = useState([]);
  const [sortFilter, setSortFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [suppliers, setSuppliers] = useState([]); 
  const [page, setPage] = useState(1);
  const itemsPerPage = 12; 
  const navigate = useNavigate(); 
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSuppliers(); // Fetch suppliers
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/products");
      setProducts(response.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách sản phẩm:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const parentRes = await axios.get(
        "http://localhost:5000/api/categories/parents"
      );
      setCategories(parentRes.data);
    } catch (error) {
      console.error("Lỗi lấy danh mục cha:", error);
    }
  };

  const fetchSubcategories = async (parentIds) => {
    try {
      const allSubcategories = [];
      for (const parentId of parentIds) {
        const response = await axios.get(
          `http://localhost:5000/api/categories/subcategories/${parentId}`
        );
        allSubcategories.push(...response.data);
      }
      setSubcategories(allSubcategories); // Lưu tất cả danh mục con vào state
    } catch (error) {
      console.error("Lỗi lấy danh mục con:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/suppliers");
      setSuppliers(response.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách nhà cung cấp:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
      try {
        await axios.delete(`http://localhost:5000/api/products/${id}`);
        fetchProducts();
      } catch (error) {
        console.error("Lỗi xóa sản phẩm:", error);
      }
    }
  };

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseDialog = () => {
    setSelectedProduct(null);
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const filteredProducts = products
    .filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase())
    )
    .filter((product) =>
      categoryFilter.length > 0
        ? categoryFilter.includes(product.parentCategory?._id?.toString())
        : true
    )
    .filter((product) =>
      subcategoryFilter.length > 0
        ? subcategoryFilter.includes(product.subCategory?._id?.toString())
        : true
    )
    .sort((a, b) => {
      if (sortFilter === "Mới nhất") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortFilter === "Cũ nhất") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      return 0;
    });

  const paginatedProducts = filteredProducts.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Quản lý sản phẩm
      </Typography>

      {/* Thanh tìm kiếm */}
      <TextField
        label="Tìm kiếm sản phẩm..."
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Bộ lọc danh mục */}
      {/* Bộ lọc danh mục chính */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Chọn danh mục chính</InputLabel>
        <Select
          multiple
          value={categoryFilter}
          onChange={(e) => {
            const selectedIds = e.target.value.map((id) => id.toString()); // Đảm bảo ID là String
            setCategoryFilter(selectedIds);
            setSubcategoryFilter([]);
            fetchSubcategories(selectedIds);
          }}
          renderValue={(selected) =>
            categories
              .filter((cat) => selected.includes(cat._id.toString()))
              .map((cat) => cat.name)
              .join(", ")
          }
        >
          {categories.map((category) => (
            <MenuItem key={category._id} value={category._id.toString()}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Bộ lọc danh mục con */}
      <FormControl
        fullWidth
        sx={{ mb: 2 }}
        disabled={categoryFilter.length === 0}
      >
        <InputLabel>Chọn danh mục phụ</InputLabel>
        <Select
          multiple // Cho phép chọn nhiều danh mục con
          value={subcategoryFilter}
          onChange={(e) => setSubcategoryFilter(e.target.value)}
          renderValue={(selected) =>
            subcategories
              .filter((sub) => selected.includes(sub._id))
              .map((sub) => sub.name)
              .join(", ")
          }
        >
          {subcategories.map((subcategory) => (
            <MenuItem key={subcategory._id} value={subcategory._id}>
              {subcategory.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Bộ lọc sắp xếp */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Sắp xếp theo</InputLabel>
        <Select
          value={sortFilter}
          onChange={(e) => setSortFilter(e.target.value)}
        >
          <MenuItem value="">Tất cả</MenuItem>
          <MenuItem value="Mới nhất">Mới nhất</MenuItem>
          <MenuItem value="Cũ nhất">Cũ nhất</MenuItem>
        </Select>
      </FormControl>

      {/* Nút thêm sản phẩm */}
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        sx={{ mb: 3 }}
        onClick={() => navigate("/add-product")} // Correct navigation function
      >
        Thêm sản phẩm
      </Button>

      {/* Hiển thị danh sách sản phẩm */}
      <Grid container spacing={3}>
        {paginatedProducts.map((product) => (
          <Grid item xs={12} sm={6} md={3} key={product._id}>
            <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <CardMedia
                component="img"
                height="200"
                image={product.mainImage || "https://via.placeholder.com/200"}
                alt={product.name}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6">{product.name}</Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 3,
                    overflow: "hidden",
                  }}
                >
                  {product.description}
                </Typography>
                <Typography variant="body1" color="primary">
                  {product.price.toLocaleString()} VNĐ
                </Typography>
              </CardContent>
              <CardActions>
                <IconButton
                  color="primary"
                  onClick={() => navigate(`/edit-product/${product._id}`)}
                >
                  <Edit />
                </IconButton>

                <IconButton
                  color="error"
                  onClick={() => handleDelete(product._id)}
                >
                  <Delete />
                </IconButton>
                <IconButton
                  color="default"
                  onClick={() => handleViewDetails(product)}
                >
                  <Visibility />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      <Pagination
        count={Math.ceil(filteredProducts.length / itemsPerPage)}
        page={page}
        onChange={handlePageChange}
        sx={{ mt: 3, display: "flex", justifyContent: "center" }}
      />

      {/* Dialog xem chi tiết sản phẩm */}
      <Dialog
        open={!!selectedProduct}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          {selectedProduct && (
            <>
              {/* Ảnh chính + ảnh phụ */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "15px",
                }}
              >
                {/* Ảnh chính */}
                <CardMedia
                  component="img"
                  height="350"
                  sx={{
                    maxWidth: "100%",
                    borderRadius: "10px",
                    objectFit: "contain",
                  }}
                  image={
                    selectedProduct.displayImage ||
                    selectedProduct.mainImage ||
                    "https://via.placeholder.com/350"
                  }
                  alt={selectedProduct.name}
                />

                {/* Ảnh phụ hiển thị dạng lưới */}
                <Grid container spacing={1} justifyContent="center">
                  {/* Ảnh chính được đưa vào danh sách ảnh phụ */}
                  {[
                    selectedProduct.mainImage,
                    ...(selectedProduct.additionalImages || []),
                  ].map((img, index) => (
                    <Grid item key={index}>
                      <CardMedia
                        component="img"
                        height="80"
                        sx={{
                          width: "80px",
                          cursor: "pointer",
                          borderRadius: "8px",
                          objectFit: "cover",
                          border:
                            selectedProduct.displayImage === img
                              ? "3px solid #1976d2"
                              : "2px solid #ddd",
                          transition: "border 0.3s",
                        }}
                        image={img}
                        alt={`Ảnh ${index}`}
                        onClick={() =>
                          setSelectedProduct({
                            ...selectedProduct,
                            displayImage: img,
                          })
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
              </div>

              {/* Thông tin sản phẩm */}
              <Typography variant="h5" sx={{ mt: 3 }}>
                {selectedProduct.name}
              </Typography>
              <Typography>
                <strong>Giá:</strong> {selectedProduct.price.toLocaleString()}{" "}
                VNĐ
              </Typography>
              <Typography>
                <strong>Danh mục chính:</strong>{" "}
                {selectedProduct.parentCategory?.name || "Không có"}
              </Typography>
              <Typography>
                <strong>Danh mục phụ:</strong>{" "}
                {selectedProduct.subCategory?.name || "Không có"}
              </Typography>
              <Typography>
                <strong>Nhà cung cấp:</strong>{" "}
                {selectedProduct.supplier?.name || "Không có"}
              </Typography>
              <Typography>
                <strong>Đơn vị:</strong> {selectedProduct.unit}
              </Typography>
              <Typography>
                <strong>Số lượng tồn kho:</strong> {selectedProduct.stock}
              </Typography>
              <Typography>
                <strong>Đánh giá:</strong>
                <Rating
                  value={selectedProduct.rating || 0}
                  readOnly
                  size="small"
                  sx={{ verticalAlign: "middle" }}
                />
              </Typography>
              {/* Mô tả sản phẩm */}
              <Typography variant="h6" sx={{ mt: 3 }}>
                Mô tả sản phẩm
              </Typography>
              <Typography color="text.secondary">
                {selectedProduct.description || "Không có mô tả"}
              </Typography>

              {/* Thông tin chi tiết */}
              <Typography variant="h6" sx={{ mt: 3 }}>
                Thông tin chi tiết
              </Typography>
              <Typography color="text.secondary">
                {selectedProduct.details || "Không có mô tả"}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ManageProducts;
