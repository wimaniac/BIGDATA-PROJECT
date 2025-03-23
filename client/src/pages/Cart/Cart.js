import React, { useState, useEffect } from "react";
import { Container, Typography, Grid, Card, CardMedia, CardContent, Button, Box, IconButton, Divider } from "@mui/material";
import { Add, Remove, Delete } from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Cart = ({ userId }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      fetchCart();
    } else {
      console.error("❌ userId is undefined");
      setLoading(false);
    }
  }, [userId]);

  const fetchCart = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/cart/${userId}`);
      setCart(response.data);
      setLoading(false);
    } catch (error) {
      console.error("❌ Lỗi lấy giỏ hàng:", error);
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await axios.put("http://localhost:5000/api/cart/update", { userId, productId, quantity: newQuantity });
      fetchCart();
    } catch (error) {
      console.error("❌ Lỗi cập nhật giỏ hàng:", error);
    }
  };

  const removeFromCart = async (productId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?")) return;
    try {
      await axios.delete("http://localhost:5000/api/cart/remove", { data: { userId, productId } });
      fetchCart();
    } catch (error) {
      console.error("❌ Lỗi xóa sản phẩm:", error);
    }
  };

  const getTotalPrice = () => {
    return cart?.items?.reduce((total, item) => total + item.productId.price * item.quantity, 0);
  };

  if (loading) return <Typography textAlign="center">Đang tải giỏ hàng...</Typography>;

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", textAlign: "center", mb: 3 }}>
        🛒 Giỏ hàng của bạn
      </Typography>

      <Grid container spacing={3}>
        {cart?.items?.map((item) => (
          <Grid item xs={12} key={item.productId._id}>
            <Card sx={{ display: "flex", alignItems: "center", p: 2, boxShadow: 3, borderRadius: 2 }}>
              {/* Ảnh sản phẩm */}
              <CardMedia component="img" image={item.productId.mainImage} alt={item.productId.name} sx={{ width: 100, height: 100, borderRadius: 2 }} />
              
              {/* Thông tin sản phẩm */}
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>{item.productId.name}</Typography>
                <Typography color="primary" sx={{ fontSize: "18px", fontWeight: "bold" }}>
                  {item.productId.price.toLocaleString()} VNĐ
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <IconButton onClick={() => updateQuantity(item.productId._id, item.quantity - 1)}><Remove /></IconButton>
                  <Typography variant="h6" sx={{ mx: 2 }}>{item.quantity}</Typography>
                  <IconButton onClick={() => updateQuantity(item.productId._id, item.quantity + 1)}><Add /></IconButton>
                </Box>
              </CardContent>

              {/* Nút xóa */}
              <IconButton onClick={() => removeFromCart(item.productId._id)} color="error">
                <Delete />
              </IconButton>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Tổng tiền và nút thanh toán */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>Tổng tiền: {getTotalPrice()?.toLocaleString()} VNĐ</Typography>
        <Button variant="contained" color="primary" size="large" onClick={() => navigate("/checkout")}>
          Tiến hành thanh toán
        </Button>
      </Box>
    </Container>
  );
};

export default Cart;
