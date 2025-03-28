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
  Button,
  Paper,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import { Delete as DeleteIcon, Visibility as VisibilityIcon } from "@mui/icons-material";

// Styled components
const ManagementContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(6),
}));

const OrderManagement = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const token = localStorage.getItem("token");
  const userRole = JSON.parse(localStorage.getItem("user"))?.role;

  useEffect(() => {
    const fetchOrders = async () => {
      if (!token || !["sales", "manager", "admin"].includes(userRole)) {
        alert("Bạn không có quyền truy cập trang này!");
        window.location.href = "http://localhost:3000/login";
        return;
      }

      try {
        const response = await axios.get("http://localhost:5000/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách đơn hàng:", error);
        setLoading(false);
      }
    };
    fetchOrders();
  }, [token, userRole, navigate]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/orders/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Phản hồi từ API:", response.data);
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, status: response.data.status } : order
        )
      );
      alert("Cập nhật trạng thái thành công!");
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái:", error.response?.data || error.message);
      alert("Có lỗi xảy ra khi cập nhật trạng thái!");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders((prevOrders) => prevOrders.filter((order) => order._id !== orderId));
      alert("Xóa đơn hàng thành công!");
    } catch (error) {
      console.error("Lỗi khi xóa đơn hàng:", error);
      alert("Có lỗi xảy ra khi xóa đơn hàng!");
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
  };

  const handleCloseDetails = () => {
    setSelectedOrder(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isStatusEditable = (status) => {
    return status !== "Đã giao" && status !== "Đã hủy";
  };

  // Hàm định dạng ngày giờ
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (loading) {
    return (
      <ManagementContainer>
        <Typography variant="h6">Đang tải...</Typography>
      </ManagementContainer>
    );
  }

  return (
    <ManagementContainer>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
        Quản lý đơn hàng
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã đơn hàng</TableCell>
              <TableCell>Khách hàng</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Số điện thoại</TableCell>
              <TableCell>Tổng tiền</TableCell>
              <TableCell>Thời gian tạo</TableCell> {/* Thêm cột Thời gian tạo */}
              <TableCell>Trạng thái</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((order) => (
                <TableRow key={order._id}>
                  <TableCell>{order._id}</TableCell>
                  <TableCell>{order.shippingInfo?.name || "Chưa có tên"}</TableCell>
                  <TableCell>{order.user?.email || "Chưa có email"}</TableCell>
                  <TableCell>{order.shippingInfo?.phone || "Chưa có số"}</TableCell>
                  <TableCell>{order.totalAmount.toLocaleString()} VNĐ</TableCell>
                  <TableCell>{formatDateTime(order.createdAt)}</TableCell> {/* Hiển thị thời gian tạo */}
                  <TableCell>
                    {isStatusEditable(order.status) ? (
                      <FormControl sx={{ minWidth: 120 }}>
                        <Select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        >
                          <MenuItem value="Đang xử lí">Đang xử lí</MenuItem>
                          <MenuItem value="Đang giao">Đang giao</MenuItem>
                          <MenuItem value="Đã giao">Đã giao</MenuItem>
                          <MenuItem value="Đã hủy">Đã hủy</MenuItem>
                        </Select>
                      </FormControl>
                    ) : (
                      <Typography>{order.status}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleViewDetails(order)}>
                      <VisibilityIcon color="primary" />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteOrder(order._id)}>
                      <DeleteIcon color="error" />
                    </IconButton>
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
              <strong>Khách hàng:</strong> {selectedOrder.shippingInfo?.name || "Chưa có"}
            </Typography>
            <Typography>
              <strong>Email:</strong> {selectedOrder.user?.email || "Chưa có email"}
            </Typography>
            <Typography>
              <strong>Số điện thoại:</strong> {selectedOrder.shippingInfo?.phone || "Chưa có"}
            </Typography>
            <Typography>
              <strong>Địa chỉ:</strong>{" "}
              {`${selectedOrder.shippingInfo?.address.street || ""}, 
                ${selectedOrder.shippingInfo?.address.ward || ""}, 
                ${selectedOrder.shippingInfo?.address.district || ""}, 
                ${selectedOrder.shippingInfo?.address.city || ""}, 
                ${selectedOrder.shippingInfo?.address.country || ""}`}
            </Typography>
            <Typography>
              <strong>Tổng tiền:</strong> {selectedOrder.totalAmount.toLocaleString()} VNĐ
            </Typography>
            <Typography>
              <strong>Thời gian tạo:</strong> {formatDateTime(selectedOrder.createdAt)}
            </Typography>
            <Typography>
              <strong>Trạng thái:</strong> {selectedOrder.status}
            </Typography>
            <Typography>
              <strong>Kho xử lý:</strong> {selectedOrder.warehouse?.name || "Chưa xác định"}
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
    </ManagementContainer>
  );
};

export default OrderManagement;