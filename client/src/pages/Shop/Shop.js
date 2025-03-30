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
  FormControlLabel,
  Checkbox,
  Slider,
  Pagination,
  IconButton,
  Breadcrumbs,
  Link as MuiLink,
  CircularProgress,
  Collapse,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  GridView as GridViewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";

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

const Shop = () => {
  const { categoryId } = useParams(); // categoryId giờ có thể là "best-selling" hoặc "newest"
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(4);
  const [sortOption, setSortOption] = useState("default");
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [page, setPage] = useState(1);
  const [showSuppliers, setShowSuppliers] = useState(true);
  const productsPerPage = 12;

  useEffect(() => {
    fetchData();
  }, [categoryId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let productResponse;
      if (categoryId === "best-selling") {
        productResponse = await axios.get("http://localhost:5000/api/products/best-selling");
        setCategoryName("Sản phẩm bán chạy");
        setSortOption("bestSelling");
      } else if (categoryId === "newest") {
        productResponse = await axios.get("http://localhost:5000/api/products/newest");
        setCategoryName("Sản phẩm mới");
        setSortOption("newest");
      } else {
        productResponse = await axios.get("http://localhost:5000/api/products");
        let fetchedProducts = productResponse.data;

        if (categoryId) {
          fetchedProducts = fetchedProducts.filter(
            (product) =>
              product.parentCategory._id === categoryId ||
              product.subCategory?._id === categoryId
          );
          const categoryResponse = await axios.get(
            `http://localhost:5000/api/categories/${categoryId}`
          );
          setCategoryName(categoryResponse.data.name);
        } else {
          setCategoryName("Tất cả sản phẩm");
        }
        productResponse.data = fetchedProducts;
      }

      setProducts(productResponse.data);
      setFilteredProducts(productResponse.data);

      if (categoryId && categoryId !== "best-selling" && categoryId !== "newest") {
        const subCategoryResponse = await axios.get(
          `http://localhost:5000/api/categories/subcategories/${categoryId}`
        );
        setSubCategories(subCategoryResponse.data);
      } else {
        setSubCategories([]);
      }

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

    if (selectedSubCategories.length > 0) {
      result = result.filter((product) =>
        selectedSubCategories.includes(product.subCategory?._id)
      );
    }

    if (selectedSuppliers.length > 0) {
      result = result.filter((product) =>
        selectedSuppliers.includes(product.supplier?._id)
      );
    }

    result = result.filter(
      (product) => product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    if (inStock) {
      result = result.filter((product) => product.stock > 0);
    }

    if (onSale) {
      result = result.filter((product) => product.discountedPrice !== undefined);
    }

    switch (sortOption) {
      case "bestSelling":
        result.sort((a, b) => (b.popularityRank || 0) - (a.popularityRank || 0));
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "priceAsc":
        result.sort((a, b) => (a.discountedPrice || a.price) - (b.discountedPrice || b.price));
        break;
      case "priceDesc":
        result.sort((a, b) => (b.discountedPrice || b.price) - (a.discountedPrice || a.price));
        break;
      default:
        break;
    }

    setFilteredProducts(result);
  }, [
    selectedSubCategories,
    selectedSuppliers,
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

  const handleSubCategoryChange = (subCategoryId) => {
    setSelectedSubCategories((prev) =>
      prev.includes(subCategoryId)
        ? prev.filter((id) => id !== subCategoryId)
        : [...prev, subCategoryId]
    );
  };

  const handleSupplierChange = (supplierId) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
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
                {subCategories.map((sub) => (
                  <FormControlLabel
                    key={sub._id}
                    control={
                      <Checkbox
                        checked={selectedSubCategories.includes(sub._id)}
                        onChange={() => handleSubCategoryChange(sub._id)}
                      />
                    }
                    label={sub.name}
                  />
                ))}
              </>
            )}

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
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

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Giá (VNĐ)
            </Typography>
            <Slider
              value={priceRange}
              onChange={(e, newValue) => setPriceRange(newValue)}
              valueLabelDisplay="auto"
              min={0}
              max={10000000}
              step={10000} // Bước giá thay đổi thành 10,000 VNĐ
            />

            <Box display="flex" alignItems="center" sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Nhà cung cấp
              </Typography>
              <IconButton onClick={() => setShowSuppliers(!showSuppliers)}>
                {showSuppliers ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Collapse in={showSuppliers}>
              {suppliers.map((supplier) => (
                <FormControlLabel
                  key={supplier._id}
                  control={
                    <Checkbox
                      checked={selectedSuppliers.includes(supplier._id)}
                      onChange={() => handleSupplierChange(supplier._id)}
                    />
                  }
                  label={supplier.name}
                />
              ))}
            </Collapse>
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
            </Box>
          </Box>

          <Grid container spacing={3}>
            {currentProducts.map((product) => (
              <Grid item xs={12 / viewMode} key={product._id}>
                <ProductCard>
                  <Link
                    to={`/product/${product._id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={product.mainImage || "https://via.placeholder.com/200"}
                      alt={product.name}
                    />
                    <CardContent>
                      <Typography variant="h6" noWrap>
                        {product.name}
                        {new Date(product.createdAt) >
                          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                          <Typography
                            component="span"
                            color="error"
                            sx={{ ml: 1, fontSize: "0.8rem" }}
                          >
                            Mới
                          </Typography>
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {(product.discountedPrice || product.price).toLocaleString()} VNĐ
                      </Typography>
                      {product.discountedPrice && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textDecoration: "line-through" }}
                        >
                          {product.originalPrice.toLocaleString()} VNĐ
                        </Typography>
                      )}
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