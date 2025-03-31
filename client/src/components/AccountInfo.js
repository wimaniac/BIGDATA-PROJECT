import React, { useState, useEffect } from "react";
import {
  Typography,
  Container,
  Box,
  TextField,
  Button,
  Grid,
  Paper,
  Avatar,
  Divider,
  IconButton,
  Collapse,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import axios from "axios";

const AccountInfo = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || {});
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    address: {
      street: user.address?.street || "",
      ward: user.address?.ward || "",
      district: user.address?.district || "",
      city: user.address?.city || "",
      country: user.address?.country || "Vietnam",
    },
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Cập nhật user từ localStorage khi mount
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      setFormData({
        name: storedUser.name || "",
        email: storedUser.email || "",
        phone: storedUser.phone || "",
        address: {
          street: storedUser.address?.street || "",
          ward: storedUser.address?.ward || "",
          district: storedUser.address?.district || "",
          city: storedUser.address?.city || "",
          country: storedUser.address?.country || "Vietnam",
        },
      });
    }
  }, []);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = localStorage.getItem("token");
      console.log("Token được gửi:", token); // Log token để kiểm tra
      if (!token) {
        setError("Bạn cần đăng nhập để xem thông tin tài khoản!");
        return;
      }

      try {
        const response = await axios.get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin tài khoản:", error);
        setError(error.response?.data?.message || "Không thể lấy thông tin tài khoản!");
      }
    };

    fetchUserInfo();
  }, []);

  // Xử lý thay đổi input thông tin cơ bản
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes("address.")) {
      const addressField = name.split("address.")[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Xử lý thay đổi input mật khẩu
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Bật chế độ chỉnh sửa thông tin cơ bản
  const handleEdit = () => {
    setEditMode(true);
    setError("");
    setSuccess("");
  };

  // Hủy chỉnh sửa thông tin cơ bản
  const handleCancel = () => {
    setEditMode(false);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: {
        street: user.address?.street || "",
        ward: user.address?.ward || "",
        district: user.address?.district || "",
        city: user.address?.city || "",
        country: user.address?.country || "Vietnam",
      },
    });
    setError("");
    setSuccess("");
  };

  // Lưu thông tin cơ bản
  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Bạn cần đăng nhập để cập nhật thông tin!");
        return;
      }

      const response = await axios.put(
        `http://localhost:5000/api/users/${user._id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updatedUser = response.data;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setEditMode(false);
      setSuccess("Cập nhật thông tin thành công!");
      setError("");

      window.dispatchEvent(new Event("userUpdated"));
    } catch (error) {
      setError(error.response?.data?.message || "Cập nhật thông tin thất bại!");
      setSuccess("");
    }
  };

  // Hiển thị form đổi mật khẩu
  const togglePasswordForm = () => {
    setShowPasswordForm(!showPasswordForm);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setError("");
    setSuccess("");
  };

  // Xử lý đổi mật khẩu
  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Vui lòng điền đầy đủ các trường!");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Bạn cần đăng nhập để đổi mật khẩu!");
        return;
      }

      const response = await axios.put(
        `http://localhost:5000/api/users/${user._id}/change-password`,
        { currentPassword, newPassword },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess("Đổi mật khẩu thành công!");
      setError("");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
    } catch (error) {
      setError(error.response?.data?.message || "Đổi mật khẩu thất bại!");
      setSuccess("");
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Thông tin tài khoản
          </Typography>
          {!editMode && (
            <IconButton color="primary" onClick={handleEdit}>
              <EditIcon />
            </IconButton>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          {/* Avatar */}
          <Grid item xs={12} sm={4} display="flex" justifyContent="center">
            <Avatar
              src={user.avatar}
              alt={user.name}
              sx={{ width: 120, height: 120, mb: 2 }}
            />
          </Grid>

          {/* Thông tin chi tiết */}
          <Grid item xs={12} sm={8}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Họ và tên"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Số điện thoại"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Vai trò"
                  value={user.role || "customer"}
                  fullWidth
                  disabled
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Địa chỉ */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Địa chỉ
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Số nhà, tên đường"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phường/Xã"
                  name="address.ward"
                  value={formData.address.ward}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Quận/Huyện"
                  name="address.district"
                  value={formData.address.district}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Thành phố/Tỉnh"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Quốc gia"
                  name="address.country"
                  value={formData.address.country}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editMode}
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Nút đổi mật khẩu */}
          <Grid item xs={12}>
            <Button
              variant="outlined"
              startIcon={<LockIcon />}
              onClick={togglePasswordForm}
              sx={{ mt: 2 }}
            >
              Đổi mật khẩu
            </Button>
          </Grid>

          {/* Form đổi mật khẩu */}
          <Grid item xs={12}>
            <Collapse in={showPasswordForm}>
              <Box mt={2} p={2} border={1} borderColor="grey.300" borderRadius={2}>
                <Typography variant="h6" gutterBottom>
                  Đổi mật khẩu
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Mật khẩu hiện tại"
                      name="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Mật khẩu mới"
                      name="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Xác nhận mật khẩu mới"
                      name="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="flex-end" gap={2}>
                      <Button
                        variant="outlined"
                        color="secondary"
                        onClick={togglePasswordForm}
                      >
                        Hủy
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleChangePassword}
                      >
                        Lưu mật khẩu
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Grid>
        </Grid>

        {/* Thông báo lỗi hoặc thành công */}
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
        {success && (
          <Typography color="success.main" sx={{ mt: 2 }}>
            {success}
          </Typography>
        )}

        {/* Nút hành động cho thông tin cơ bản */}
        {editMode && (
          <Box display="flex" justifyContent="flex-end" mt={3} gap={2}>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
            >
              Lưu
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default AccountInfo;