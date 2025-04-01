import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // Thêm useLocation
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
  AccountCircle,
  RateReview,
  AttachMoney,
  Warehouse as WarehouseIcon,
} from "@mui/icons-material";
import axios from "axios";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Lấy query string từ URL
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      // Retrieve token from query string or localStorage
      const params = new URLSearchParams(location.search);
      const tokenFromQuery = params.get("token");
      const token = tokenFromQuery || localStorage.getItem("token");

      if (token) {
        try {
          const response = await axios.get("http://localhost:5000/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const userData = response.data;
          setUser(userData);

          // Save token and user data to localStorage
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(userData));
          localStorage.setItem("userId", userData._id);
        } catch (error) {
          console.error("Lỗi khi lấy thông tin người dùng:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("userId");
          window.location.href = "http://localhost:3000/login";
        }
      } else {
        window.location.href = "http://localhost:3000/login";
      }
    };

    fetchUserData();
  }, [location]);

  const toggleSidebar = () => {
    setOpen(!open);
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    window.location.href = "http://localhost:3000/login";
    handleUserMenuClose();
  };

  const getRoleTitle = () => {
    if (!user) return "Dashboard";
    switch (user.role) {
      case "admin":
        return "Bảng điều khiển của Admin";
      case "manager":
        return "Bảng điều khiển của Quản lý";
      case "sales":
        return "Bảng điều khiển của Nhân viên bán hàng";
      default:
        return "Dashboard";
    }
  };

  return (
    <div style={{ display: "flex" }}>
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

      <Drawer
        variant="permanent"
        open={open}
        style={{ width: open ? 250 : 60, transition: "width 0.3s ease-in-out" }}
        PaperProps={{
          style: {
            width: open ? 250 : 60,
            background: "#2C3E50",
            color: "#ECF0F1",
            transition: "width 0.3s ease-in-out",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          },
        }}
      >
        <div>
          <div style={{ padding: open ? "16px" : "16px 8px", textAlign: "center" }}>
            {open && (
              <Typography variant="h6" component="h1">
                {getRoleTitle()}
              </Typography>
            )}
          </div>
          <Divider style={{ background: "#BDC3C7" }} />
          <List>
            {[
              { text: "Sản phẩm", icon: <Category />, path: "/manage-products" },
              { text: "Danh mục", icon: <Category />, path: "/manage-categories" },
              { text: "Nhà cung cấp", icon: <LocalShipping />, path: "/manage-suppliers" },
              { text: "Người dùng", icon: <People />, path: "/user-management" },
              { text: "Đơn hàng", icon: <ShoppingCart />, path: "/manage-orders" },
              { text: "Giảm giá", icon: <LocalOffer />, path: "/manage-discounts" },
              { text: "Kho hàng", icon: <Storage />, path: "/manage-inventory" },
              { text: "Quản lý kho", icon: <WarehouseIcon />, path: "/manage-warehouses" },
              { text: "Đánh giá", icon: <RateReview />, path: "/manage-reviews" },
              { text: "Doanh thu", icon: <AttachMoney />, path: "/manage-revenue" },
            ].map(({ text, icon, path }) => (
              <ListItem
                key={text}
                onClick={() => handleNavigation(path)}
                style={{ padding: open ? "10px 16px" : "10px", transition: "padding 0.3s" }}
              >
                <ListItemIcon style={{ color: "#ECF0F1", minWidth: 40 }}>
                  {icon}
                </ListItemIcon>
                {open && <ListItemText primary={text} />}
              </ListItem>
            ))}
          </List>
        </div>

        <div style={{ padding: open ? "16px" : "16px 8px" }}>
          <IconButton onClick={handleUserMenuOpen} style={{ color: "#ECF0F1" }}>
            <AccountCircle />
            {open && user && (
              <Typography variant="body2" style={{ marginLeft: 8 }}>
                {user.name}
              </Typography>
            )}
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
            PaperProps={{ style: { background: "#2C3E50", color: "#ECF0F1" } }}
          >
            <MenuItem
              onClick={() => {
                handleNavigation("/account-info");
                handleUserMenuClose();
              }}
            >
              Thông tin tài khoản
            </MenuItem>
            <MenuItem onClick={handleLogout}>Đăng xuất</MenuItem>
          </Menu>
        </div>
      </Drawer>

      <main style={{ flexGrow: 1, marginLeft: open ? 250 : 60, transition: "margin-left 0.3s ease-in-out" }}>
        {/* Nội dung chính */}
      </main>
    </div>
  );
};

export default Sidebar;