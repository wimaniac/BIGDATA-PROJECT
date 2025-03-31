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
  Checkbox,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from "@mui/icons-material";

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
  const [selectedItems, setSelectedItems] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = localStorage.getItem("userId") || (user && user._id);

  useEffect(() => {
    const fetchCart = async () => {
      if (!userId) {
        console.log("Không tìm thấy userId, yêu cầu đăng nhập.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5000/api/cart/${userId}`);
        const cartData = response.data;

        const updatedItems = await Promise.all(
          cartData.items.map(async (item) => {
            try {
              const discountResponse = await axios.get(
                `http://localhost:5000/api/discounts/apply/${item.productId._id}`
              );
              return {
                ...item,
                productId: {
                  ...item.productId,
                  originalPrice: discountResponse.data.originalPrice ?? item.productId.price,
                  discountedPrice: discountResponse.data.discountedPrice ?? item.productId.price,
                  stock: item.productId.stock,
                },
              };
            } catch (error) {
              console.error(`Lỗi lấy giảm giá cho sản phẩm ${item.productId._id}:`, error);
              return {
                ...item,
                productId: {
                  ...item.productId,
                  originalPrice: item.productId.price,
                  discountedPrice: item.productId.price,
                  stock: item.productId.stock,
                },
              };
            }
          })
        );

        setCart({ ...cartData, items: updatedItems });
        setSelectedItems(updatedItems.map((item) => item.productId._id));
        setLoading(false);
      } catch (error) {
        console.error("Lỗi lấy giỏ hàng:", error);
        setLoading(false);
      }
    };

    fetchCart();
  }, [userId]);

  const handleQuantityChange = async (productId, newQuantity) => {
    const clampedQuantity = Math.max(1, newQuantity);

    const productInCart = cart?.items.find((item) => item.productId._id === productId);
    if (!productInCart) return;

    const availableStock = productInCart.productId.stock;
    if (clampedQuantity > availableStock) {
      alert(`Số lượng yêu cầu (${clampedQuantity}) vượt quá tồn kho (${availableStock})!`);
      return;
    }

    setCart((prevCart) => {
      if (!prevCart || !prevCart.items) return prevCart;
      const updatedItems = prevCart.items.map((item) =>
        item.productId._id === productId ? { ...item, quantity: clampedQuantity } : item
      );
      const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { cartCount: totalItems } }));
      return { ...prevCart, items: updatedItems };
    });

    try {
      const response = await axios.put(
        "http://localhost:5000/api/cart/update",
        {
          userId,
          productId,
          quantity: clampedQuantity,
        }
      );
      const updatedCartFromServer = response.data.cart || null;

      setCart((prevCart) => {
        if (!prevCart || !updatedCartFromServer) return updatedCartFromServer;
        const mergedItems = updatedCartFromServer.items.map((serverItem) => {
          const localItem = prevCart.items.find(
            (item) => item.productId._id === serverItem.productId._id
          );
          return {
            ...serverItem,
            productId: {
              ...serverItem.productId,
              originalPrice:
                serverItem.productId.originalPrice ?? localItem?.productId.originalPrice,
              discountedPrice:
                serverItem.productId.discountedPrice ?? localItem?.productId.discountedPrice,
              stock: serverItem.productId.stock ?? localItem?.productId.stock,
            },
          };
        });
        return { ...updatedCartFromServer, items: mergedItems };
      });

      const totalItems =
        updatedCartFromServer?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { cartCount: totalItems } }));
    } catch (error) {
      console.error("Lỗi cập nhật số lượng:", error);
      setCart((prevCart) => {
        if (!prevCart || !prevCart.items) return prevCart;
        const revertedItems = prevCart.items.map((item) =>
          item.productId._id === productId ? { ...item, quantity: item.quantity } : item
        );
        const totalItems = revertedItems.reduce((sum, item) => sum + item.quantity, 0);
        window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { cartCount: totalItems } }));
        return { ...prevCart, items: revertedItems };
      });
      alert(error.response?.data?.error || "Có lỗi xảy ra khi cập nhật số lượng!");
    }
  };

  const handleRemoveItem = async (productId) => {
    setCart((prevCart) => {
      if (!prevCart || !prevCart.items) return prevCart;
      const updatedItems = prevCart.items.filter((item) => item.productId._id !== productId);
      const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { cartCount: totalItems } }));
      return { ...prevCart, items: updatedItems };
    });
    setSelectedItems((prev) => prev.filter((id) => id !== productId));
  
    try {
      await axios.delete("http://localhost:5000/api/cart/remove", {
        data: { userId, productId },
      });
  
      // Gọi lại API GET để lấy giỏ hàng đầy đủ
      const response = await axios.get(`http://localhost:5000/api/cart/${userId}`);
      const cartData = response.data;
  
      const updatedItems = await Promise.all(
        cartData.items.map(async (item) => {
          try {
            const discountResponse = await axios.get(
              `http://localhost:5000/api/discounts/apply/${item.productId._id}`
            );
            return {
              ...item,
              productId: {
                ...item.productId,
                originalPrice: discountResponse.data.originalPrice ?? item.productId.price,
                discountedPrice: discountResponse.data.discountedPrice ?? item.productId.price,
                stock: item.productId.stock,
              },
            };
          } catch (error) {
            console.error(`Lỗi lấy giảm giá cho sản phẩm ${item.productId._id}:`, error);
            return {
              ...item,
              productId: {
                ...item.productId,
                originalPrice: item.productId.price,
                discountedPrice: item.productId.price,
                stock: item.productId.stock,
              },
            };
          }
        })
      );
  
      setCart({ ...cartData, items: updatedItems });
      const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { cartCount: totalItems } }));
    } catch (error) {
      console.error("Lỗi xóa sản phẩm:", error);
      alert("Có lỗi xảy ra khi xóa sản phẩm!");
    }
  };

  const handleSelectItem = (productId) => {
    setSelectedItems((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const calculateTotal = () => {
    if (!cart || !cart.items) return 0;
    return cart.items
      .filter((item) => selectedItems.includes(item.productId._id))
      .reduce(
        (total, item) => total + (item.productId.discountedPrice || 0) * item.quantity,
        0
      );
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm để thanh toán!");
      return;
    }

    // Chuyển hướng sang trang Checkout và truyền dữ liệu giỏ hàng
    const selectedCartItems = cart.items.filter((item) =>
      selectedItems.includes(item.productId._id)
    );
    navigate("/checkout", { state: { cart: { items: selectedCartItems } } });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
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
          <Button variant="contained" color="primary" component={Link} to="/shop">
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
          {cart.items.map((item) => (
            <CartItemCard key={item.productId?._id || item._id}>
              <Checkbox
                checked={selectedItems.includes(item.productId._id)}
                onChange={() => handleSelectItem(item.productId._id)}
                sx={{ mr: 2 }}
              />
              <CardMedia
                component="img"
                image={item.productId.mainImage || "https://via.placeholder.com/100"}
                alt={item.productId.name}
                sx={{ width: 100, height: 100, objectFit: "contain", mr: 2 }}
              />
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="h6">{item.productId.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.productId.discountedPrice !== item.productId.originalPrice ? (
                    <>
                      <span style={{ textDecoration: "line-through", color: "gray" }}>
                        {(item.productId.originalPrice || 0).toLocaleString()} VNĐ
                      </span>{" "}
                      <span style={{ color: "red" }}>
                        {(item.productId.discountedPrice || 0).toLocaleString()} VNĐ
                      </span>
                    </>
                  ) : (
                    `${(item.productId.originalPrice || 0).toLocaleString()} VNĐ`
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Số lượng: {item.productId.stock}
                </Typography>
                <Box display="flex" alignItems="center" mt={1}>
                  <IconButton
                    onClick={() => handleQuantityChange(item.productId._id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <RemoveIcon />
                  </IconButton>
                  <TextField
                    value={item.quantity}
                    onChange={(e) =>
                      handleQuantityChange(item.productId._id, Number(e.target.value))
                    }
                    inputProps={{ min: 1, max: item.productId.stock }}
                    sx={{ width: 100, mx: 1 }}
                  />
                  <IconButton
                    onClick={() => handleQuantityChange(item.productId._id, item.quantity + 1)}
                    disabled={item.quantity >= item.productId.stock}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </CardContent>
              <IconButton onClick={() => handleRemoveItem(item.productId._id)}>
                <DeleteIcon color="error" />
              </IconButton>
            </CartItemCard>
          ))}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, boxShadow: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Tổng cộng
            </Typography>
            <Typography variant="h5" color="primary" sx={{ mb: 2 }}>
              {calculateTotal().toLocaleString()} VNĐ
            </Typography>
            <CheckoutButton variant="contained" color="primary" fullWidth onClick={handleCheckout}>
              Tiến hành thanh toán
            </CheckoutButton>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Cart;