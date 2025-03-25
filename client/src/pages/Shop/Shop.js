import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Grid,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Slider,
  Pagination,
  IconButton,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  GridView as GridViewIcon,
} from "@mui/icons-material";

// Styled components
const FilterBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRight: "1px solid #e0e0e0",
  height: "100%",
}));

const ProductCard = styled(Card)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  transition: "0.3s",
  "&:hover": {
    boxShadow: theme.shadows[6],
  },
}));

const SortButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  fontWeight: "bold",
  borderRadius: 20,
  border: "1px solid #1976d2",
  color: "#1976d2",
  "&:hover": {
    backgroundColor: "#1976d2",
    color: "#fff",
  },
}));

const Shop = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categoryName, setCategoryName] = useState(""); // Tên danh mục
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(4);
  const [sortOption, setSortOption] = useState("default");
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [page, setPage] = useState(1);
  const productsPerPage = 12;

  useEffect(() => {
    fetchData();
  }, [categoryId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Lấy sản phẩm
      const productResponse = await axios.get("http://localhost:5000/api/products");
      let fetchedProducts = productResponse.data;

      if (categoryId) {
        fetchedProducts = fetchedProducts.filter(
          (product) =>
            product.parentCategory._id === categoryId ||
            product.subCategory?._id === categoryId
        );

        // Lấy tên danh mục
        const categoryResponse = await axios.get(
          `http://localhost:5000/api/categories/${categoryId}`
        );
        setCategoryName(categoryResponse.data.name);
      } else {
        setCategoryName("Tất cả sản phẩm");
      }

      setProducts(fetchedProducts);
      setFilteredProducts(fetchedProducts);

      // Lấy danh mục con nếu có categoryId
      if (categoryId) {
        const subCategoryResponse = await axios.get(
          `http://localhost:5000/api/categories/subcategories/${categoryId}`
        );
        setSubCategories(subCategoryResponse.data);
      }

      // Lấy danh sách nhà cung cấp
      const supplierResponse = await axios.get("http://localhost:5000/api/suppliers");
      setSuppliers(supplierResponse.data);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = [...products];

    if (selectedSubCategory) {
      result = result.filter((product) => product.subCategory?._id === selectedSubCategory);
    }

    if (selectedSupplier) {
      result = result.filter((product) => product.supplier?._id === selectedSupplier);
    }

    result = result.filter(
      (product) => product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    if (inStock) {
      result = result.filter((product) => product.stock > 0);
    }

    if (onSale) {
      result = result.filter((product) => product.isFeature);
    }

    switch (sortOption) {
      case "bestSelling":
        result.sort((a, b) => b.stock - a.stock);
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "priceAsc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        result.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }

    setFilteredProducts(result);
  }, [
    selectedSubCategory,
    selectedSupplier,
    priceRange,
    inStock,
    onSale,
    sortOption,
    products,
  ]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const indexOfLastProduct = page * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  const handleViewChange = (mode) => {
    setViewMode(mode);
  };

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>Đang tải...</Box>;
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumb */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <MuiLink component={Link} to="/" underline="hover" color="inherit">
          Trang chủ
        </MuiLink>
        <Typography color="text.primary">{categoryName}</Typography>
      </Breadcrumbs>

      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
        Cửa hàng
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <FilterBox>
            {subCategories.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom>
                  Danh mục con
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Danh mục</InputLabel>
                  <Select
                    value={selectedSubCategory || ""}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    {subCategories.map((sub) => (
                      <MenuItem key={sub._id} value={sub._id}>
                        {sub.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            {selectedSubCategory && (
              <>
                <Typography variant="h6" gutterBottom>
                  Tình trạng
                </Typography>
                <FormControlLabel
                  control={<Checkbox checked={inStock} onChange={(e) => setInStock(e.target.checked)} />}
                  label="Còn hàng"
                />
                <FormControlLabel
                  control={<Checkbox checked={onSale} onChange={(e) => setOnSale(e.target.checked)} />}
                  label="Đang giảm giá"
                />
              </>
            )}

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Giá (VNĐ)
            </Typography>
            <Slider
              value={priceRange}
              onChange={(e, newValue) => setPriceRange(newValue)}
              valueLabelDisplay="auto"
              min={0}
              max={10000000}
              step={100000}
            />

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Nhà cung cấp
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Nhà cung cấp</InputLabel>
              <Select
                value={selectedSupplier || ""}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <MenuItem value="">Tất cả</MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </FilterBox>
        </Grid>

        <Grid item xs={12} md={9}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {filteredProducts.length} sản phẩm
            </Typography>
            <Box display="flex" alignItems="center">
              <IconButton onClick={() => handleViewChange(1)}>
                <ViewListIcon color={viewMode === 1 ? "primary" : "inherit"} />
              </IconButton>
              <IconButton onClick={() => handleViewChange(2)}>
                <ViewModuleIcon color={viewMode === 2 ? "primary" : "inherit"} />
              </IconButton>
              <IconButton onClick={() => handleViewChange(3)}>
                <GridViewIcon color={viewMode === 3 ? "primary" : "inherit"} />
              </IconButton>
              <IconButton onClick={() => handleViewChange(4)}>
                <GridViewIcon color={viewMode === 4 ? "primary" : "inherit"} />
              </IconButton>

              <FormControl sx={{ ml: 2, minWidth: 150 }}>
                <InputLabel>Sắp xếp theo</InputLabel>
                <Select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <MenuItem value="default">Mặc định</MenuItem>
                  <MenuItem value="bestSelling">Bán chạy</MenuItem>
                  <MenuItem value="newest">Mới nhất</MenuItem>
                  <MenuItem value="priceAsc">Giá tăng dần</MenuItem>
                  <MenuItem value="priceDesc">Giá giảm dần</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {currentProducts.map((product) => (
              <Grid item xs={12 / viewMode} key={product._id}>
                <ProductCard>
                  <Link to={`/product/${product._id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={product.mainImage || "https://via.placeholder.com/200"}
                      alt={product.name}
                    />
                    <CardContent>
                      <Typography variant="h6" noWrap>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {product.price.toLocaleString()} VNĐ
                      </Typography>
                    </CardContent>
                  </Link>
                </ProductCard>
              </Grid>
            ))}
          </Grid>

          <Box display="flex" justifyContent="center" mt={4}>
            <Pagination
              count={Math.ceil(filteredProducts.length / productsPerPage)}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Shop;