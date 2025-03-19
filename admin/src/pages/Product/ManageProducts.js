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
} from "@mui/material";
import { Edit, Delete, Add } from "@mui/icons-material";
import axios from "axios";

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [sortFilter, setSortFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
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
      const response = await axios.get("http://localhost:5000/api/categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Lỗi lấy danh mục sản phẩm:", error);
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

  const filteredProducts = products
    .filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase())
    )
    .filter((product) =>
      categoryFilter ? product.category === categoryFilter : true
    )
    .filter((product) =>
      subcategoryFilter ? product.subcategory === subcategoryFilter : true
    )
    .sort((a, b) => {
      if (sortFilter === "Mới nhất") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortFilter === "Cũ nhất") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      return 0;
    });

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
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Chọn danh mục chính</InputLabel>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <MenuItem value="">Tất cả</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category._id} value={category._id}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Bộ lọc danh mục con */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Chọn danh mục phụ</InputLabel>
        <Select value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)}>
          <MenuItem value="">Tất cả</MenuItem>
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
        <Select value={sortFilter} onChange={(e) => setSortFilter(e.target.value)}>
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
        onClick={() => alert("Thêm sản phẩm chưa được triển khai!")}
      >
        Thêm sản phẩm
      </Button>

      {/* Hiển thị danh sách sản phẩm */}
      <Grid container spacing={3}>
        {filteredProducts.map((product) => (
          <Grid item xs={12} sm={6} md={3} key={product._id}>
            <Card>
              <CardMedia
                component="img"
                height="200"
                image={product.mainImage || "https://via.placeholder.com/200"}
                alt={product.name}
              />
              <CardContent>
                <Typography variant="h6">{product.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {product.description}
                </Typography>
                <Typography variant="body1" color="primary">
                  {product.price.toLocaleString()} VNĐ
                </Typography>
              </CardContent>
              <CardActions>
                <IconButton color="primary" onClick={() => alert("Chỉnh sửa chưa triển khai!")}>
                  <Edit />
                </IconButton>
                <IconButton color="error" onClick={() => handleDelete(product._id)}>
                  <Delete />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default ManageProducts;
