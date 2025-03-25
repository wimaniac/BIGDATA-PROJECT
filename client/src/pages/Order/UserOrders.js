import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";

// Styled components
const OrdersContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(6),
}));

const UserOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchUserOrders = async () => {
      if (!userId || !token) {
        alert("Vui lòng đăng nhập để xem đơn hàng!");
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5000/api/orders/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách đơn hàng:", error);
        setLoading(false);
      }
    };
    fetchUserOrders();
  }, [userId, token, navigate]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
  };

  const handleCloseDetails = () => {
    setSelectedOrder(null);
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn hàng này không?")) return;

    try {
      const response = await axios.put(
        `http://localhost:5000/api/orders/cancel/${orderId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, status: response.data.status } : order
        )
      );
      alert("Hủy đơn hàng thành công!");
    } catch (error) {
      console.error("Lỗi khi hủy đơn hàng:", error);
      alert("Có lỗi xảy ra khi hủy đơn hàng!");
    }
  };

  if (loading) {
    return (
      <OrdersContainer>
        <Typography variant="h6">Đang tải...</Typography>
      </OrdersContainer>
    );
  }

  return (
    <OrdersContainer>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
        Đơn hàng của tôi
      </Typography>
      {orders.length === 0 ? (
        <Typography>Bạn chưa có đơn hàng nào.</Typography>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mã đơn hàng</TableCell>
                  <TableCell>Tổng tiền</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Ngày đặt</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((order) => (
                    <TableRow key={order._id}>
                      <TableCell>{order._id}</TableCell>
                      <TableCell>{order.totalAmount.toLocaleString()} VNĐ</TableCell>
                      <TableCell>{order.status}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleViewDetails(order)}
                          sx={{ mr: 1 }}
                        >
                          Xem chi tiết
                        </Button>
                        {order.status === "Đang xử lí" && (
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => handleCancelOrder(order._id)}
                          >
                            Hủy đơn
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={orders.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>

          {/* Dialog chi tiết đơn hàng */}
          {selectedOrder && (
            <Dialog open={!!selectedOrder} onClose={handleCloseDetails}>
              <DialogTitle>Chi tiết đơn hàng {selectedOrder._id}</DialogTitle>
              <DialogContent>
                <Typography>
                  <strong>Tổng tiền:</strong> {selectedOrder.totalAmount.toLocaleString()} VNĐ
                </Typography>
                <Typography>
                  <strong>Trạng thái:</strong> {selectedOrder.status}
                </Typography>
                <Typography>
                  <strong>Ngày đặt:</strong> {new Date(selectedOrder.createdAt).toLocaleDateString()}
                </Typography>
                <Typography>
                  <strong>Thông tin giao hàng:</strong>
                </Typography>
                <Typography>
                  - Tên: {selectedOrder.shippingInfo?.name || "Chưa có"}
                </Typography>
                <Typography>
                  - Địa chỉ: {`${selectedOrder.shippingInfo?.address.street || ""}, 
                    ${selectedOrder.shippingInfo?.address.ward || ""}, 
                    ${selectedOrder.shippingInfo?.address.district || ""}, 
                    ${selectedOrder.shippingInfo?.address.city || ""}, 
                    ${selectedOrder.shippingInfo?.address.country || ""}`}
                </Typography>
                <Typography>
                  - Số điện thoại: {selectedOrder.shippingInfo?.phone || "Chưa có"}
                </Typography>
                <Typography>
                  <strong>Sản phẩm:</strong>
                </Typography>
                <ul>
                  {selectedOrder.products.map((item) => (
                    <li key={item.product._id}>
                      {item.product.name} - Số lượng: {item.quantity}
                    </li>
                  ))}
                </ul>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDetails} color="primary">
                  Đóng
                </Button>
              </DialogActions>
            </Dialog>
          )}
        </>
      )}
    </OrdersContainer>
  );
};

export default UserOrders;