import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // Thêm useLocation
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";

// Styled components
const CheckoutCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  boxShadow: theme.shadows[3],
}));

const CheckoutButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(1.5),
  fontWeight: "bold",
  textTransform: "none",
  backgroundColor: "#1976d2",
  "&:hover": {
    backgroundColor: "#1565c0",
  },
}));

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Lấy state từ Cart.js
  const [cart, setCart] = useState(location.state?.cart || null); // Lấy giỏ hàng từ state
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    address: {
      street: "",
      ward: "",
      district: "",
      city: "",
      country: "Vietnam",
    },
    phone: "",
    paymentMethod: "Tiền mặt khi nhận hàng",
  });
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userId || !token) {
          console.log("Thiếu userId hoặc token trong localStorage");
          navigate("/login");
          return;
        }
  
        const userResponse = await axios.get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = userResponse.data;
  
        if (!cart) {
          const cartResponse = await axios.get(`http://localhost:5000/api/cart/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setCart(cartResponse.data);
        }
  
        setFormData({
          name: user.name || "",
          address: {
            street: user.address?.street || "",
            ward: user.address?.ward || "",
            district: user.address?.district || "",
            city: user.address?.city || "",
            country: user.address?.country || "Vietnam",
          },
          phone: user.phone || "",
          paymentMethod: "Tiền mặt khi nhận hàng",
        });
  
        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi kiểm tra đăng nhập hoặc lấy dữ liệu:", error);
        if (error.response?.status === 401) {
          console.log("Token không hợp lệ, chuyển hướng về /login");
          localStorage.removeItem("token"); // Xóa token không hợp lệ
          localStorage.removeItem("userId");
          navigate("/login");
        } else {
          alert("Thanh toán thành công");
        }
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, token, navigate, cart]);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [addressField]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const calculateTotal = () => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce(
      (total, item) => total + (item.productId.discountedPrice || item.productId.price) * item.quantity,
      0
    );
  };

  const handleCheckout = async () => {
    const { name, address, phone, paymentMethod } = formData;
    if (!name || !address.street || !address.city || !phone || !paymentMethod) {
      alert("Vui lòng điền đầy đủ thông tin giao hàng và chọn phương thức thanh toán!");
      return;
    }
  
    if (!cart || !cart.items || cart.items.length === 0) {
      alert("Giỏ hàng trống! Vui lòng thêm sản phẩm trước khi thanh toán.");
      return;
    }
  
    try {
      // Tạo dữ liệu đơn hàng từ giỏ hàng frontend
      const orderData = {
        user: userId,
        products: cart.items.map((item) => ({
          product: item.productId._id,
          quantity: item.quantity,
          price: item.productId.discountedPrice || item.productId.price,
        })),
        totalAmount: calculateTotal(),
        shippingInfo: { name, address, phone },
        status: "Đang xử lí",
      };
      console.log("Tạo đơn hàng với dữ liệu:", orderData);
  
      // Gửi request tạo đơn hàng
      const orderResponse = await axios.post(
        "http://localhost:5000/api/orders",
        orderData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      // Lấy orderId từ response
      const orderId = orderResponse.data.order._id;
      console.log("Order ID:", orderId);
  
      // Tạo dữ liệu thanh toán
      const paymentData = {
        order: orderId,
        user: userId,
        paymentMethod,
        transactionId: paymentMethod === "Tiền mặt khi nhận hàng" ? null : "TEMP_ID",
        status: "Đang xử lí",
      };
      console.log("Tạo thanh toán với dữ liệu:", paymentData);
  
      // Gửi request tạo thanh toán
      const paymentResponse = await axios.post(
        "http://localhost:5000/api/payments",
        paymentData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Payment Response:", paymentResponse.data);
  
      // Cập nhật thông tin người dùng
      console.log("Cập nhật thông tin người dùng:", { shippingInfo: { address: formData.address, phone: formData.phone } });
      await axios.put(
        `http://localhost:5000/api/users/${userId}`,
        {
          shippingInfo: { address: formData.address, phone: formData.phone },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      // Reset giỏ hàng trong frontend
      setCart(null);
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { cartCount: 0 } }));
  
      // Điều hướng về trang chủ
      navigate("/");
    } catch (error) {
      console.error("Lỗi khi thanh toán:", error);
      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("Data:", error.response.data);
        alert(`Có lỗi xảy ra: ${error.response.data.message || "Lỗi không xác định"}`);
      } else {
        alert("Có lỗi xảy ra khi thanh toán!");
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography variant="h6">Đang tải...</Typography>
      </Box>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h5" align="center">
          Giỏ hàng của bạn đang trống!
        </Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
        Thanh toán
      </Typography>

      <Grid container spacing={3}>
        {/* Thông tin giỏ hàng */}
        <Grid item xs={12} md={6}>
          <CheckoutCard>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Sản phẩm trong giỏ hàng
              </Typography>
              {cart.items.map((item) => (
                <Box key={item.productId._id} sx={{ mb: 2 }}>
                  <Typography variant="body1">
                    {item.productId.name} - {item.quantity} x{" "}
                    {(item.productId.discountedPrice || item.productId.price).toLocaleString()} VNĐ
                  </Typography>
                </Box>
              ))}
              <Typography variant="h6" sx={{ mt: 2 }}>
                Tổng cộng: {calculateTotal().toLocaleString()} VNĐ
              </Typography>
            </CardContent>
          </CheckoutCard>
        </Grid>

        {/* Form thông tin giao hàng */}
        <Grid item xs={12} md={6}>
          <CheckoutCard>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Thông tin giao hàng
              </Typography>
              <TextField
                label="Họ và tên"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                label="Số nhà, tên đường"
                name="address.street"
                value={formData.address.street}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                label="Phường/Xã"
                name="address.ward"
                value={formData.address.ward}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Quận/Huyện"
                name="address.district"
                value={formData.address.district}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Thành phố/Tỉnh"
                name="address.city"
                value={formData.address.city}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
              />
              <TextField
                label="Quốc gia"
                name="address.country"
                value={formData.address.country}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Số điện thoại"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Phương thức thanh toán</InputLabel>
                <Select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  label="Phương thức thanh toán"
                >
                  <MenuItem value="Tiền mặt khi nhận hàng">Tiền mặt khi nhận hàng</MenuItem>
                  <MenuItem value="Chuyển khoản ngân hàng">Chuyển khoản ngân hàng</MenuItem>
                </Select>
              </FormControl>
              <CheckoutButton
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleCheckout}
              >
                Xác nhận thanh toán
              </CheckoutButton>
            </CardContent>
          </CheckoutCard>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Checkout;