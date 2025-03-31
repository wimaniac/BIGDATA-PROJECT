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
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [snackbarOpen, setSnackbarOpen] = useState(false); // Thông báo

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/products/${id}`
        );
        setProduct(response.data);
        setSelectedImage(response.data.mainImage);
        setLoading(false);
      } catch (error) {
        console.error("Lỗi lấy thông tin sản phẩm:", error);
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleIncrease = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecrease = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };
  const handleAddToCart = async () => {
    const userId = localStorage.getItem("userId");
    console.log("userId:", userId);
    console.log("productId:", id);
    console.log("quantity:", quantity);
    if (!userId) {
      alert("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
      navigate("/login");
      return;
    }
    try {
      console.log("Gửi yêu cầu đến: http://localhost:5000/api/cart/add");
      const response = await axios.post("http://localhost:5000/api/cart/add", {
        userId,
        productId: id,
        quantity,
      });
      const updatedCart = response.data.cart || null;
      const totalItems =
        updatedCart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      window.dispatchEvent(
        new CustomEvent("cartUpdated", { detail: { cartCount: totalItems } })
      );

      setSnackbarOpen(true);
      setTimeout(() => navigate("/cart"), 1500);
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ hàng:", error);
      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("Data:", error.response.data);
      }
      alert("Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng!");
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
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

          <Typography
            variant="h4"
            color="primary"
            sx={{ fontWeight: "bold", mb: 2 }}
          >
            {product.price.toLocaleString()} VNĐ
          </Typography>

          <Typography variant="body1" sx={{ fontSize: "16px", mb: 2 }}>
            {product.description || "Chưa có mô tả sản phẩm."}
          </Typography>

          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            <strong>Chi tiết:</strong> {product.details || "Không có chi tiết."}
          </Typography>

          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            <strong>Số lượng:</strong>{" "}
            {product.stock > 0 ? `${product.stock}` : "Hết hàng"}
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

      {/* Thông báo thành công */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={1500}
        onClose={handleSnackbarClose}
        message="Thêm vào giỏ hàng thành công!"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Container>
  );
};

export default ProductDetail;
