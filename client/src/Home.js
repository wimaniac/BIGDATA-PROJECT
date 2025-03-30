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
  const navigate = useNavigate();

  useEffect(() => {
    fetchBestSellers();
    fetchNewProducts();
    fetchParentCategories();
  }, []);

  const fetchBestSellers = async () => {
    try {
      setLoadingBestSellers(true);
      const response = await axios.get("http://localhost:5000/api/products/best-selling", {
        params: { limit: 8 },
      });
      setBestSellers(response.data);
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
      const response = await axios.get("http://localhost:5000/api/products/newest", {
        params: { limit: 8 },
      });
      setNewProducts(response.data);
    } catch (error) {
      console.error("Lỗi lấy sản phẩm mới:", error);
      setNewProducts([]);
    } finally {
      setLoadingNewProducts(false);
    }
  };

  const fetchParentCategories = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/categories/parents");
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
      const response = await axios.get(
        `http://localhost:5000/api/categories/subcategories/${parentId}`
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
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
                  <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
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
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {product.name}
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

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={4} mb={2}>
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
                  <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
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
    </Box>
  );
};

export default Home;