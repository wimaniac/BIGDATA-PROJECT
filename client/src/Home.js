import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Badge,
  Menu,
  MenuItem,
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Button,
  Box,
  TextField,
  InputBase,
  CircularProgress,
  Rating,
  Snackbar,
  Alert,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import {
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
} from "@mui/icons-material";
import axios from "axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { Link, useNavigate } from "react-router-dom";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/autoplay";
import banner1 from "./assets/banner1.jpg";
import banner2 from "./assets/banner2.jpg";
import banner3 from "./assets/banner3.jpg";
import logo from "./assets/logo.jpg";

const banners = [banner1, banner2, banner3];

// Các styled components giữ nguyên như trước
const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": { backgroundColor: alpha(theme.palette.common.white, 0.25) },
  width: "40%",
  [theme.breakpoints.down("sm")]: { width: "100%" },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  display: "flex",
  alignItems: "center",
  pointerEvents: "none",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  width: "100%",
  paddingLeft: `calc(1em + ${theme.spacing(4)})`,
}));

const StyledViewAllButton = styled(Button)(({ theme }) => ({
  borderRadius: 20,
  textTransform: "none",
  fontWeight: "bold",
  padding: "5px 15px",
  border: "1px solid #1976d2",
  color: "#1976d2",
  "&:hover": {
    backgroundColor: "#1976d2",
    color: "#fff",
  },
}));

const AddToCartButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(1),
  borderRadius: 20,
  textTransform: "none",
  fontWeight: "bold",
  backgroundColor: "#1976d2",
  color: "#fff",
  "&:hover": {
    backgroundColor: "#1565c0",
  },
}));

const Home = () => {
  const [bestSellers, setBestSellers] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loadingBestSellers, setLoadingBestSellers] = useState(true);
  const [loadingNewProducts, setLoadingNewProducts] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [parentCategories, setParentCategories] = useState([]);
  const [childCategories, setChildCategories] = useState({});
  const [childAnchorEl, setChildAnchorEl] = useState(null);
  const [currentParentId, setCurrentParentId] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchBestSellers();
    fetchNewProducts();
    fetchParentCategories();
  }, [navigate]);

  const fetchBestSellers = async () => {
    try {
      setLoadingBestSellers(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5000/api/products/best-selling",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBestSellers(response.data.slice(0, 12)); // Chỉ lấy 12 sản phẩm đầu tiên
    } catch (error) {
      console.error("Lỗi lấy sản phẩm bán chạy:", error);
      setBestSellers([]);
    } finally {
      setLoadingBestSellers(false);
    }
  };

  const fetchNewProducts = async () => {
    try {
      setLoadingNewProducts(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5000/api/products/newest",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNewProducts(response.data.slice(0, 12)); // Chỉ lấy 12 sản phẩm đầu tiên
    } catch (error) {
      console.error("Lỗi lấy sản phẩm mới:", error);
      setNewProducts([]);
    } finally {
      setLoadingNewProducts(false);
    }
  };

  const fetchParentCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5000/api/categories/parents",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setParentCategories(response.data);
    } catch (error) {
      console.error("Lỗi lấy danh mục cha:", error);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setChildAnchorEl(null);
    setChildCategories({});
    setCurrentParentId(null);
  };

  const handleParentHover = async (event, parentId) => {
    setCurrentParentId(parentId);
    setChildAnchorEl(event.currentTarget);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/categories/subcategories/${parentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setChildCategories((prev) => ({ ...prev, [parentId]: response.data }));
    } catch (error) {
      console.error("Lỗi lấy danh mục con:", error);
    }
  };

  const handleChildMenuClose = () => {
    setChildAnchorEl(null);
    setCurrentParentId(null);
  };

  const handleAddToCart = async (productId) => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId) {
      setSnackbar({
        open: true,
        message: "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!",
        severity: "warning",
      });
      setTimeout(() => navigate("/login"), 1500);
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/api/cart/add",
        {
          userId,
          productId,
          quantity: 1,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updatedCart = response.data.cart || null;
      const totalItems =
        updatedCart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      window.dispatchEvent(
        new CustomEvent("cartUpdated", { detail: { cartCount: totalItems } })
      );

      setSnackbar({
        open: true,
        message: "Đã thêm sản phẩm vào giỏ hàng!",
        severity: "success",
      });
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      setSnackbar({
        open: true,
        message: "Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng!",
        severity: "error",
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={30}
        slidesPerView={1}
        autoplay={{ delay: 3000 }}
        pagination={{ clickable: true }}
        navigation
      >
        {banners.map((banner, index) => (
          <SwiperSlide key={index}>
            <Box
              component="img"
              src={banner}
              alt={`Banner ${index + 1}`}
              sx={{ width: "100%", height: "400px", objectFit: "cover" }}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      <Container sx={{ my: 4 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            Sản phẩm bán chạy
          </Typography>
          <StyledViewAllButton
            component={Link}
            to="/shop/best-selling"
            endIcon={<ArrowForwardIosIcon fontSize="small" />}
          >
            Xem tất cả
          </StyledViewAllButton>
        </Box>
        {loadingBestSellers ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {bestSellers.length > 0 ? (
              bestSellers.map((product) => (
                <Grid item xs={12} sm={6} md={3} key={product._id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <Link
                      to={`/product/${product._id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <CardMedia
                        component="img"
                        height="200"
                        image={product.mainImage || "/assets/placeholder.jpg"}
                        alt={product.name}
                      />
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" noWrap>
                          {product.name}
                        </Typography>
                        <Rating
                          value={product.ratings || 0}
                          readOnly
                          precision={0.5}
                          size="small"
                          sx={{ my: 1 }}
                        />
                        {product.isDiscounted ? (
                          <>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ textDecoration: "line-through" }}
                            >
                              {product.originalPrice.toLocaleString()} VNĐ
                            </Typography>
                            <Typography
                              variant="body1"
                              color="error"
                              sx={{ fontWeight: "bold" }}
                            >
                              {product.discountedPrice.toLocaleString()} VNĐ
                            </Typography>
                          </>
                        ) : (
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: "bold" }}
                          >
                            {product.originalPrice.toLocaleString()} VNĐ
                          </Typography>
                        )}
                      </CardContent>
                    </Link>
                    <Box sx={{ p: 2 }}>
                      <AddToCartButton
                        fullWidth
                        variant="contained"
                        onClick={() => handleAddToCart(product._id)}
                      >
                        Thêm vào giỏ hàng
                      </AddToCartButton>
                    </Box>
                  </Card>
                </Grid>
              ))
            ) : (
              <Typography variant="body1" sx={{ my: 2 }}>
                Không có sản phẩm bán chạy nào để hiển thị.
              </Typography>
            )}
          </Grid>
        )}

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={4}
          mb={2}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            Sản phẩm mới
          </Typography>
          <StyledViewAllButton
            component={Link}
            to="/shop/newest"
            endIcon={<ArrowForwardIosIcon fontSize="small" />}
          >
            Xem tất cả
          </StyledViewAllButton>
        </Box>
        {loadingNewProducts ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {newProducts.length > 0 ? (
              newProducts.map((product) => (
                <Grid item xs={12} sm={6} md={3} key={product._id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <Link
                      to={`/product/${product._id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <CardMedia
                        component="img"
                        height="200"
                        image={product.mainImage || "/assets/placeholder.jpg"}
                        alt={product.name}
                      />
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" noWrap>
                          {product.name}
                        </Typography>
                        <Rating
                          value={product.ratings || 0}
                          readOnly
                          precision={0.5}
                          size="small"
                          sx={{ my: 1 }}
                        />
                        {product.isDiscounted ? (
                          <>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ textDecoration: "line-through" }}
                            >
                              {product.originalPrice.toLocaleString()} VNĐ
                            </Typography>
                            <Typography
                              variant="body1"
                              color="error"
                              sx={{ fontWeight: "bold" }}
                            >
                              {product.discountedPrice.toLocaleString()} VNĐ
                            </Typography>
                          </>
                        ) : (
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: "bold" }}
                          >
                            {product.originalPrice.toLocaleString()} VNĐ
                          </Typography>
                        )}
                      </CardContent>
                    </Link>
                    <Box sx={{ p: 2 }}>
                      <AddToCartButton
                        fullWidth
                        variant="contained"
                        onClick={() => handleAddToCart(product._id)}
                      >
                        Thêm vào giỏ hàng
                      </AddToCartButton>
                    </Box>
                  </Card>
                </Grid>
              ))
            ) : (
              <Typography variant="body1" sx={{ my: 2 }}>
                Không có sản phẩm mới nào để hiển thị.
              </Typography>
            )}
          </Grid>
        )}
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Home;