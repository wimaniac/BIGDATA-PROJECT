import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
  TextField,
} from "@mui/material";
import axios from "axios";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]); // Danh sách user đã lọc
  const [searchTerm, setSearchTerm] = useState(""); // Từ khóa tìm kiếm
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const currentUser = JSON.parse(localStorage.getItem("user")) || {};
  const token = localStorage.getItem("token");

  // Lấy danh sách user khi component mount
  useEffect(() => {
    const fetchUsers = async () => {
      if (!token || currentUser.role !== "admin") {
        setError("Bạn không có quyền truy cập trang này!");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get("http://localhost:5000/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data);
        setFilteredUsers(response.data); // Khởi tạo danh sách lọc ban đầu
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || "Không thể tải danh sách user!");
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token, currentUser.role]);

  // Lọc user khi searchTerm thay đổi
  useEffect(() => {
    const filtered = users.filter((user) => {
      const nameMatch = user.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const emailMatch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || emailMatch;
    });
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  // Xử lý thay đổi vai trò
  const handleRoleChange = async (userId, newRole) => {
    try {
      setError("");
      setSuccess("");
      const response = await axios.put(
        `http://localhost:5000/api/users/${userId}/role`,
        { role: newRole },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Cập nhật danh sách user trong state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userId ? { ...user, role: response.data.role } : user
        )
      );
      setSuccess("Cập nhật vai trò thành công!");
    } catch (err) {
      setError(err.response?.data?.message || "Cập nhật vai trò thất bại!");
    }
  };

  // Xử lý thay đổi từ khóa tìm kiếm
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  if (loading) {
    return (
      <Container sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (currentUser.role !== "admin") {
    return (
      <Container sx={{ mt: 5 }}>
        <Alert severity="error">{error || "Bạn không có quyền truy cập trang này!"}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Quản lý người dùng
          </Typography>
          <TextField
            label="Tìm kiếm người dùng"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ width: 300 }}
            placeholder="Nhập tên hoặc email..."
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography fontWeight="bold">Họ và tên</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">Email</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">Vai trò</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">Hành động</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.name || "Không có tên"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role || "customer"}
                      onChange={(e) => handleRoleChange(user._id, e.target.value)}
                      disabled={user._id === currentUser._id}
                      size="small"
                    >
                      <MenuItem value="customer">Khách hàng</MenuItem>
                      <MenuItem value="sales">Nhân viên bán hàng</MenuItem>
                      <MenuItem value="manager">Quản lý</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {/* Có thể thêm các hành động khác như xóa user nếu cần */}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography>Không tìm thấy người dùng nào!</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default UserManagement;