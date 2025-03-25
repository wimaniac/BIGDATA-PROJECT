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
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import {
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from "@mui/icons-material";
import axios from "axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { Link } from "react-router-dom";

// Import CSS của Swiper
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/autoplay";

// Import hình ảnh banner và logo
import banner1 from "./assets/banner1.jpg";
import banner2 from "./assets/banner2.jpg";
import banner3 from "./assets/banner3.jpg";
import logo from "./assets/logo.jpg";

const banners = [banner1, banner2, banner3];

// Tạo thanh tìm kiếm đẹp hơn
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
const SearchBox = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.black, 0.05),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.black, 0.1),
  },
  marginLeft: theme.spacing(2),
  width: "40%",
  [theme.breakpoints.down("sm")]: {
    width: "100%",
  },
}));
const Home = () => {
  const [bestSellers, setBestSellers] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [parentCategories, setParentCategories] = useState([]);
  const [childCategories, setChildCategories] = useState({});
  const [childAnchorEl, setChildAnchorEl] = useState(null);
  const [currentParentId, setCurrentParentId] = useState(null);

  useEffect(() => {
    fetchBestSellers();
    fetchNewProducts();
    fetchParentCategories();
  }, []);

  const fetchBestSellers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/products");
      setBestSellers(response.data.slice(0, 8)); // Chỉ lấy 8 sản phẩm
    } catch (error) {
      console.error("Lỗi lấy sản phẩm bán chạy:", error);
    }
  };

  const fetchNewProducts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/products");
      setNewProducts(response.data.slice(0, 8)); // Chỉ lấy 8 sản phẩm
    } catch (error) {
      console.error("Lỗi lấy sản phẩm mới:", error);
    }
  };

  const fetchParentCategories = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/categories/parents"
      );
      setParentCategories(response.data);
    } catch (error) {
      console.error("Lỗi lấy danh mục cha:", error);
    }
  };

  const fetchChildCategories = async (parentId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/categories/subcategories/${parentId}`
      );
      setChildCategories((prev) => ({ ...prev, [parentId]: response.data }));
    } catch (error) {
      console.error("Lỗi lấy danh mục con:", error);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setChildAnchorEl(null);
    setChildCategories([]);
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
      {/* Banner Swiper */}
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

      {/* Nội dung trang */}
      <Container sx={{ my: 4 }}>
        {/* Best Sellers */}
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
            to="/shop?sort=bestSelling" // Thêm query để lọc sản phẩm bán chạy
            endIcon={<ArrowForwardIosIcon fontSize="small" />}
          >
            Xem tất cả
          </StyledViewAllButton>
        </Box>
        <Grid container spacing={3}>
          {bestSellers.map((product) => (
            <Grid item xs={12} sm={6} md={3} key={product._id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
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
                  <CardContent>
                    <Typography variant="h6" noWrap>
                      {product.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {product.price} VND
                    </Typography>
                  </CardContent>
                </Link>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* New Products */}
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
            to="/shop?sort=newest" 
            endIcon={<ArrowForwardIosIcon fontSize="small" />}
          >
            Xem tất cả
          </StyledViewAllButton>
        </Box>
        <Grid container spacing={3}>
          {newProducts.map((product) => (
            <Grid item xs={12} sm={6} md={3} key={product._id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
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
                  <CardContent>
                    <Typography variant="h6" noWrap>
                      {product.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {product.price} VND
                    </Typography>
                  </CardContent>
                </Link>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Home;
