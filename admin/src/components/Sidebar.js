import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Typography,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Category,
  LocalShipping,
  People,
  ShoppingCart,
  LocalOffer,
  Storage,
  Menu as MenuIcon,
  ChevronLeft,
  AccountCircle, // Thêm icon user
} from "@mui/icons-material";

const Sidebar = ({ children }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null); // State cho menu dropdown

  // Lấy thông tin user từ localStorage
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userRole = user.role || "Không xác định"; // Vai trò của user

  const toggleSidebar = () => {
    setOpen(!open);
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  // Mở menu dropdown khi click vào icon user
  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Đóng menu dropdown
  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  // Xử lý đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login"); // Chuyển hướng về trang đăng nhập (có thể cần thay đổi đường dẫn)
    handleUserMenuClose();
  };

  return (
    <div style={{ display: "flex" }}>
      {/* Nút toggle sidebar */}
      <IconButton
        onClick={toggleSidebar}
        style={{
          position: "absolute",
          top: 15,
          left: open ? 230 : 10,
          zIndex: 2000,
          transition: "left 0.3s ease-in-out",
          background: "#34495E",
          color: "#ECF0F1",
          boxShadow: "0px 2px 5px rgba(0,0,0,0.2)",
          borderRadius: "50%",
          padding: 8,
        }}
      >
        {open ? <ChevronLeft /> : <MenuIcon />}
      </IconButton>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        open={open}
        style={{
          width: open ? 250 : 60,
          transition: "width 0.3s ease-in-out",
        }}
        PaperProps={{
          style: {
            width: open ? 250 : 60,
            background: "#2C3E50",
            color: "#ECF0F1",
            transition: "width 0.3s ease-in-out",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between", // Đẩy nội dung xuống dưới
          },
        }}
      >
        {/* Phần trên: Tiêu đề và Menu */}
        <div>
          <div
            style={{
              padding: open ? "16px" : "16px 8px",
              textAlign: "center",
              transition: "opacity 0.3s",
            }}
          >
            {open && (
              <Typography variant="h6">
                <h2>Dashboard - {userRole}</h2>
              </Typography>
            )}
          </div>

          <Divider style={{ background: "#BDC3C7" }} />

          {/* Danh sách menu */}
          <List>
            {[
              { text: "Sản phẩm", icon: <Category />, path: "/manage-products" },
              { text: "Danh mục", icon: <Category />, path: "/manage-categories" },
              { text: "Nhà cung cấp", icon: <LocalShipping />, path: "/manage-suppliers" },
              { text: "Người dùng", icon: <People />, path: "/manage-users" },
              { text: "Đơn hàng", icon: <ShoppingCart />, path: "/manage-orders" },
              { text: "Giảm giá", icon: <LocalOffer />, path: "/manage-discounts" },
              { text: "Kho hàng", icon: <Storage />, path: "/manage-inventory" },
            ].map(({ text, icon, path }) => (
              <ListItem
                button
                key={text}
                onClick={() => handleNavigation(path)}
                style={{
                  padding: open ? "10px 16px" : "10px",
                  transition: "padding 0.3s",
                  "&:hover": {
                    background: "#1A252F",
                  },
                }}
              >
                <ListItemIcon style={{ color: "#ECF0F1", minWidth: 40 }}>
                  {icon}
                </ListItemIcon>
                {open && <ListItemText primary={text} />}
              </ListItem>
            ))}
          </List>
        </div>

        {/* Phần dưới: Icon user */}
        <div style={{ padding: open ? "16px" : "16px 8px" }}>
          <IconButton
            onClick={handleUserMenuOpen}
            style={{ color: "#ECF0F1", width: "100%", justifyContent: open ? "flex-start" : "center" }}
          >
            <AccountCircle />
            {open && <Typography style={{ marginLeft: 10 }}>{user.name || "User"}</Typography>}
          </IconButton>

          {/* Menu dropdown */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
            PaperProps={{
              style: {
                background: "#2C3E50",
                color: "#ECF0F1",
              },
            }}
          >
            {/* Quản lý người dùng (chỉ hiển thị nếu là admin) */}
            {userRole === "admin" && (
              <MenuItem onClick={() => { handleNavigation("/manage-users"); handleUserMenuClose(); }}>
                Quản lý người dùng
              </MenuItem>
            )}
            {/* Thông tin tài khoản */}
            <MenuItem onClick={() => { handleNavigation("/account-info"); handleUserMenuClose(); }}>
              Thông tin tài khoản
            </MenuItem>
            {/* Đăng xuất */}
            <MenuItem onClick={handleLogout}>
              Đăng xuất
            </MenuItem>
          </Menu>
        </div>
      </Drawer>

      {/* Main content */}
      <main
        style={{
          flexGrow: 1,
          marginLeft: open ? 250 : 60,
          transition: "margin-left 0.3s ease-in-out",
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default Sidebar;