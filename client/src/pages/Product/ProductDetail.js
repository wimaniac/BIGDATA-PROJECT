import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  Box,
  Button,
  IconButton,
  TextField,
  Breadcrumbs,
  Link as MuiLink,
  Snackbar,
  Alert,
  Rating,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import {
  ShoppingCart as ShoppingCartIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";

// Styled components
const AddToCartButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  borderRadius: 8,
  textTransform: "none",
  fontWeight: "bold",
  padding: "12px 24px",
  fontSize: "16px",
  backgroundColor: "#1976d2",
  "&:hover": {
    backgroundColor: "#1565c0",
  },
}));

const ThumbnailImage = styled(CardMedia)(({ theme }) => ({
  width: 80,
  height: 80,
  cursor: "pointer",
  borderRadius: 8,
  transition: "0.3s",
  border: "1px solid #e0e0e0",
  "&:hover": {
    transform: "scale(1.1)",
    borderColor: "#1976d2",
  },
}));

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [tabValue, setTabValue] = useState(0); // State để quản lý tab (0: Đánh giá, 1: Chi tiết)

  useEffect(() => {
    const fetchProductAndReviews = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        // Lấy thông tin sản phẩm
        const productResponse = await axios.get(
          `http://localhost:5000/api/products/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setProduct(productResponse.data);
        setSelectedImage(productResponse.data.mainImage);

        // Lấy danh sách đánh giá
        const reviewResponse = await axios.get(
          "http://localhost:5000/api/reviews",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const productReviews = reviewResponse.data.filter(
          (review) => review.productId._id === id
        );
        setReviews(productReviews);

        setLoading(false);
      } catch (error) {
        console.error("Lỗi lấy thông tin sản phẩm hoặc đánh giá:", error);
        setLoading(false);
      }
    };

    fetchProductAndReviews();
  }, [id, navigate]);

  const handleIncrease = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecrease = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleAddToCart = async () => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    if (!userId || !token) {
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
          productId: id,
          quantity,
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
        message: "Thêm vào giỏ hàng thành công!",
        severity: "success",
      });
      setTimeout(() => navigate("/cart"), 1500);
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

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Typography variant="h6">Đang tải...</Typography>
      </Box>
    );
  }

  if (!product) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h5" color="error">
          ❌ Không tìm thấy sản phẩm!
        </Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      {/* Breadcrumb */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <MuiLink component={Link} to="/" underline="hover" color="inherit">
          Trang chủ
        </MuiLink>
        <MuiLink
          component={Link}
          to={`/shop/${product.parentCategory._id}`}
          underline="hover"
          color="inherit"
        >
          {product.parentCategory.name}
        </MuiLink>
        {product.subCategory && (
          <MuiLink
            component={Link}
            to={`/shop/${product.subCategory._id}`}
            underline="hover"
            color="inherit"
          >
            {product.subCategory.name}
          </MuiLink>
        )}
        <Typography color="text.primary">{product.name}</Typography>
      </Breadcrumbs>

      <Grid container spacing={4}>
        {/* Ảnh sản phẩm */}
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, boxShadow: 3, borderRadius: 2 }}>
            <CardMedia
              component="img"
              height="450"
              image={selectedImage || "https://via.placeholder.com/400"}
              alt={product.name}
              sx={{ objectFit: "contain", borderRadius: 2 }}
            />
            <Box display="flex" justifyContent="center" mt={2} gap={1}>
              <ThumbnailImage
                image={product.mainImage}
                onClick={() => setSelectedImage(product.mainImage)}
              />
              {product.additionalImages.map((image, index) => (
                <ThumbnailImage
                  key={index}
                  image={image}
                  onClick={() => setSelectedImage(image)}
                />
              ))}
            </Box>
          </Card>
        </Grid>

        {/* Thông tin sản phẩm */}
        <Grid item xs={12} md={6}>
          <Typography variant="h3" sx={{ fontWeight: "bold", mb: 2 }}>
            {product.name}
          </Typography>

          {/* Hiển thị rating */}
          <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
            <Rating
              value={product.ratings || 0}
              readOnly
              precision={0.5}
              size="medium"
            />
            <Typography variant="body2" sx={{ ml: 1 }}>
              ({reviews.length} đánh giá)
            </Typography>
          </Box>

          {/* Hiển thị giá gốc và giá giảm */}
          {product.isDiscounted ? (
            <>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textDecoration: "line-through", mb: 1 }}
              >
                {product.originalPrice.toLocaleString()} VNĐ
              </Typography>
              <Typography
                variant="h4"
                color="error"
                sx={{ fontWeight: "bold", mb: 2 }}
              >
                {product.discountedPrice.toLocaleString()} VNĐ
              </Typography>
            </>
          ) : (
            <Typography
              variant="h4"
              color="primary"
              sx={{ fontWeight: "bold", mb: 2 }}
            >
              {product.originalPrice.toLocaleString()} VNĐ
            </Typography>
          )}

          <Typography variant="body1" sx={{ fontSize: "16px", mb: 2 }}>
            {product.description || "Chưa có mô tả sản phẩm."}
          </Typography>

          {/* Thay số lượng tồn kho bằng số lượng đã bán */}
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            <strong>Đã bán:</strong> {product.totalSold || 0} sản phẩm
          </Typography>

          <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
            <IconButton onClick={handleDecrease} disabled={quantity <= 1}>
              <RemoveIcon />
            </IconButton>
            <TextField
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              inputProps={{ min: 1, type: "number" }}
              sx={{ width: 80, mx: 1 }}
            />
            <IconButton onClick={handleIncrease} disabled={product.stock <= 0}>
              <AddIcon />
            </IconButton>
          </Box>

          <AddToCartButton
            variant="contained"
            color="primary"
            startIcon={<ShoppingCartIcon />}
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
          >
            {product.stock > 0 ? "Thêm vào giỏ hàng" : "Hết hàng"}
          </AddToCartButton>
        </Grid>
      </Grid>

      {/* Tabs để chuyển đổi giữa Đánh giá và Chi tiết sản phẩm */}
      <Box sx={{ mt: 6 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="product tabs"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Đánh giá sản phẩm" />
          <Tab label="Chi tiết sản phẩm" />
        </Tabs>

        {/* Tab Đánh giá */}
        {tabValue === 0 && (
          <Box sx={{ mt: 3 }}>
            {reviews.length > 0 ? (
              <List>
                {reviews.map((review) => (
                  <ListItem key={review._id} alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center">
                          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                            {review.userId.name}
                          </Typography>
                          <Rating
                            value={review.rating}
                            readOnly
                            size="small"
                            sx={{ ml: 2 }}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{ mb: 1 }}
                          >
                            {new Date(review.createdAt).toLocaleDateString()}
                          </Typography>
                          <Typography variant="body1">{review.comment}</Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
                Chưa có đánh giá nào cho sản phẩm này.
              </Typography>
            )}
          </Box>
        )}

        {/* Tab Chi tiết sản phẩm */}
        {tabValue === 1 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body1" sx={{ fontSize: "16px" }}>
              {product.details || "Không có chi tiết sản phẩm."}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Thông báo */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={1500}
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
    </Container>
  );
};

export default ProductDetail;