import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container, Typography, Grid, Card, CardMedia, CircularProgress, Box, Button, 
  IconButton, TextField, Breadcrumbs, Link
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import { ShoppingCart as ShoppingCartIcon, Add as AddIcon, Remove as RemoveIcon } from "@mui/icons-material";

// 🔹 Style cho nút "Thêm vào giỏ hàng"
const AddToCartButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  borderRadius: 8,
  textTransform: "none",
  fontWeight: "bold",
  padding: "12px 24px",
  fontSize: "16px",
  "&:hover": {
    backgroundColor: "#1565c0",
  },
}));

// 🔹 Style cho hình ảnh sản phẩm phụ
const ThumbnailImage = styled(CardMedia)(({ theme }) => ({
  width: 80,
  height: 80,
  cursor: "pointer",
  borderRadius: 8,
  transition: "0.3s",
  "&:hover": {
    transform: "scale(1.1)",
  },
}));

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(""); // Ảnh chính được chọn
  const [quantity, setQuantity] = useState(1); // Số lượng sản phẩm

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/products/${id}`);
        setProduct(response.data);
        setSelectedImage(response.data.mainImage); // Hiển thị ảnh chính
        setLoading(false);
      } catch (error) {
        console.error("Lỗi lấy thông tin sản phẩm:", error);
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleIncrease = () => {
    setQuantity(prevQuantity => prevQuantity + 1);
  };

  const handleDecrease = () => {
    setQuantity(prevQuantity => (prevQuantity > 1 ? prevQuantity - 1 : 1));
  };

  const handleAddToCart = () => {
    const cartItems = JSON.parse(localStorage.getItem("cartItems")) || [];
    const itemIndex = cartItems.findIndex(item => item.id === product.id);
  
    if (itemIndex > -1) {
      cartItems[itemIndex].quantity += quantity;
    } else {
      cartItems.push({ ...product, quantity });
    }
  
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
    alert("Sản phẩm đã được thêm vào giỏ hàng!");
    navigate("/cart"); // Chuyển hướng đến trang giỏ hàng
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!product) {
    return (
      <Container>
        <Typography variant="h5" color="error">
          ❌ Không tìm thấy sản phẩm!
        </Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      {/* Breadcrumbs - hiển thị danh mục cha */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" href={`/category/${product.parentCategory._id}`}>
          {product.parentCategory.name}
        </Link>
        <Link underline="hover" color="inherit" href={`/category/${product.subCategory._id}`}>
          {product.subCategory.name}
        </Link>
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
            <Box display="flex" justifyContent="center" mt={2}>
              <ThumbnailImage
                image={product.mainImage}
                onClick={() => setSelectedImage(product.mainImage)}
                sx={{ mx: 1 }}
              />
              {product.additionalImages.map((image, index) => (
                <ThumbnailImage
                  key={index}
                  image={image}
                  onClick={() => setSelectedImage(image)}
                  sx={{ mx: 1 }}
                />
              ))}
            </Box>
          </Card>
        </Grid>

        {/* Thông tin sản phẩm */}
        <Grid item xs={12} md={6}>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
            {product.name}
          </Typography>

          <Typography variant="h5" color="primary" sx={{ fontWeight: "bold", mb: 2 }}>
            {product.price.toLocaleString()} VNĐ
          </Typography>

          <Typography variant="body1" sx={{ fontSize: "16px", mb: 2 }}>
            {product.description}
          </Typography>

          <Typography variant="body2" color="textSecondary" sx={{ fontStyle: "italic", mb: 2 }}>
            {product.details}
          </Typography>

          <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
            <IconButton onClick={handleDecrease}>
              <RemoveIcon />
            </IconButton>
            <TextField
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              inputProps={{ min: 1 }}
              sx={{ width: 60, mx: 1 }}
            />
            <IconButton onClick={handleIncrease}>
              <AddIcon />
            </IconButton>
          </Box>

          <AddToCartButton
            variant="contained"
            color="primary"
            startIcon={<ShoppingCartIcon />}
            onClick={handleAddToCart}
          >
            Thêm vào giỏ hàng
          </AddToCartButton>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProductDetail;
