import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Button,
  Box,
  IconButton,
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from "@mui/icons-material";

// Styled components (giữ nguyên)
const CartItemCard = styled(Card)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  boxShadow: theme.shadows[2],
}));

const CheckoutButton = styled(Button)(({ theme }) => ({
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

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = localStorage.getItem("userId") || (user && user._id);
  console.log("userId từ localStorage:", userId);

  useEffect(() => {
    const fetchCart = async () => {
      if (!userId) {
        console.log("Không tìm thấy userId, yêu cầu đăng nhập.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `http://localhost:5000/api/cart/${userId}`
        );
        const cartData = response.data;

        // Lấy giá sau giảm cho từng sản phẩm
        const updatedItems = await Promise.all(
          cartData.items.map(async (item) => {
            const discountResponse = await axios.get(
              `http://localhost:5000/api/discounts/apply/${item.productId._id}`
            );
            return {
              ...item,
              productId: {
                ...item.productId,
                originalPrice: discountResponse.data.originalPrice,
                discountedPrice: discountResponse.data.discountedPrice,
              },
            };
          })
        );

        setCart({ ...cartData, items: updatedItems });
        setLoading(false);
      } catch (error) {
        console.error("Lỗi lấy giỏ hàng:", error);
        setLoading(false);
      }
    };

    fetchCart();
  }, [userId]);

  const handleQuantityChange = async (productId, newQuantity) => {
    try {
      const response = await axios.put(
        "http://localhost:5000/api/cart/update",
        {
          userId,
          productId,
          quantity: Math.max(1, newQuantity),
        }
      );
      setCart(response.data.cart || null); // Đảm bảo không đặt undefined
      window.dispatchEvent(new Event("cartUpdated")); // Cập nhật Header
    } catch (error) {
      console.error("Lỗi cập nhật số lượng:", error);
      alert("Có lỗi xảy ra khi cập nhật số lượng!");
    }
  };

  const handleRemoveItem = async (productId) => {
    try {
      const response = await axios.put(
        "http://localhost:5000/api/cart/update",
        {
          userId,
          productId,
          quantity: 0,
        }
      );
      setCart(response.data.cart || null);
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (error) {
      console.error("Lỗi xóa sản phẩm:", error);
      alert("Có lỗi xảy ra khi xóa sản phẩm!");
    }
  };

  const calculateTotal = () => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce(
      (total, item) => total + item.productId.price * item.quantity,
      0
    );
  };
  const handleCheckout = async () => {
    if (!cart || !cart.items || cart.items.length === 0) {
      alert("Giỏ hàng trống, không thể thanh toán!");
      return;
    }

    try {
      const orderData = {
        userId,
        items: cart.items.map((item) => ({
          productId: item.productId._id,
          quantity: item.quantity,
          price: item.productId.price,
        })),
        total: calculateTotal(),
        status: "pending", // Trạng thái mặc định
      };

      const response = await axios.post(
        "http://localhost:5000/api/orders",
        orderData
      );
      console.log("Tạo đơn hàng thành công:", response.data);

      // Xóa giỏ hàng sau khi thanh toán (tùy chọn)
      await axios.delete(`http://localhost:5000/api/cart/remove-all/${userId}`);
      setCart(null);

      alert("Thanh toán thành công! Đơn hàng của bạn đã được tạo.");
      navigate("/orders"); // Chuyển hướng đến trang đơn hàng (nếu có)
    } catch (error) {
      console.error("Lỗi khi thanh toán:", error);
      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("Data:", error.response.data);
      }
      alert("Có lỗi xảy ra khi thanh toán!");
    }
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

  if (!userId) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h5" align="center">
          Vui lòng <Link to="/login">đăng nhập</Link> để xem giỏ hàng!
        </Typography>
      </Container>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h5" align="center">
          Giỏ hàng của bạn đang trống!
        </Typography>
        <Box display="flex" justifyContent="center" mt={2}>
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/shop"
          >
            Tiếp tục mua sắm
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
        Giỏ hàng
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {cart && cart.items && cart.items.length > 0 ? (
            cart.items.map((item) => (
              <CartItemCard key={item.productId._id}>
                <CardMedia
                  component="img"
                  image={
                    item.productId.mainImage ||
                    "https://via.placeholder.com/100"
                  }
                  alt={item.productId.name}
                  sx={{ width: 100, height: 100, objectFit: "contain", mr: 2 }}
                />
                <CardContent sx={{ flex: 1 }}>
                  <Typography variant="h6">{item.productId.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.productId.discountedPrice !==
                    item.productId.originalPrice ? (
                      <>
                        <span
                          style={{
                            textDecoration: "line-through",
                            color: "gray",
                          }}
                        >
                          {item.productId.originalPrice.toLocaleString()} VNĐ
                        </span>{" "}
                        <span style={{ color: "red" }}>
                          {item.productId.discountedPrice.toLocaleString()} VNĐ
                        </span>
                      </>
                    ) : (
                      `${item.productId.originalPrice.toLocaleString()} VNĐ`
                    )}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <IconButton
                      onClick={() =>
                        handleQuantityChange(
                          item.productId._id,
                          item.quantity - 1
                        )
                      }
                      disabled={item.quantity <= 1}
                    >
                      <RemoveIcon />
                    </IconButton>
                    <TextField
                      value={item.quantity}
                      onChange={(e) =>
                        handleQuantityChange(
                          item.productId._id,
                          Number(e.target.value)
                        )
                      }
                      inputProps={{ min: 1 }}
                      sx={{ width: 100, mx: 1 }}
                    />
                    <IconButton
                      onClick={() =>
                        handleQuantityChange(
                          item.productId._id,
                          item.quantity + 1
                        )
                      }
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                </CardContent>
                <IconButton
                  onClick={() => handleRemoveItem(item.productId._id)}
                >
                  <DeleteIcon color="error" />
                </IconButton>
              </CartItemCard>
            ))
          ) : (
            <Typography>Không có sản phẩm trong giỏ hàng.</Typography>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, boxShadow: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Tổng cộng
            </Typography>
            <Typography variant="h5" color="primary" sx={{ mb: 2 }}>
              {calculateTotal().toLocaleString()} VNĐ
            </Typography>
            <CheckoutButton
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => navigate("/checkout")}
            >
              Tiến hành thanh toán
            </CheckoutButton>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Cart;
