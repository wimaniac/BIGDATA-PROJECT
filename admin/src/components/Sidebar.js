import React, { useState, useEffect } from "react";
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
  AccountCircle,
} from "@mui/icons-material";
import axios from "axios";

const Sidebar = ({ children }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get("token");

      if (tokenFromUrl) {
        localStorage.setItem("token", tokenFromUrl);
        console.log("Token saved from URL:", tokenFromUrl);
      }

      const token = localStorage.getItem("token");
      console.log("Token from localStorage or URL:", token);

      if (token) {
        console.log("Sending request with token:", token);
        try {
          const response = await axios.get("http://localhost:5000/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log("User from API:", response.data);
          setUser(response.data);
          localStorage.setItem("user", JSON.stringify(response.data));
        } catch (error) {
          console.error("Error fetching user:", error.message);
          console.error("Error details:", error.response?.data || error);
          if (error.response?.status === 401 || error.response?.status === 404) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "http://localhost:3000/login";
          }
        }
      } else {
        console.log("No token found, redirecting to login");
        window.location.href = "http://localhost:3000/login";
      }
    };

    fetchUser();
  }, []);

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
    window.location.href = "http://localhost:3000/login"; // Sửa lỗi navigate
    handleUserMenuClose();
  };

  const getRoleTitle = () => {
    console.log("Current user in getRoleTitle:", user);
    if (!user) {
      console.log("No user found, returning default title");
      return "Dashboard";
    }
    console.log("User role:", user.role);
    switch (user.role) {
      case "admin":
        return "Bảng điều khiển của Admin ";
      case "manager":
        return "Bảng điều khiển của quản lý";
      case "sales":
        return "Bảng điều khiển của nhân viên bán hàng";
      default:
        console.log("Role not matched, returning default title");
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
            justifyContent: "space-between",
          },
        }}
      >
        <div>
          <div
            style={{
              padding: open ? "16px" : "16px 8px",
              textAlign: "center",
              transition: "opacity 0.3s",
            }}
          >
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
  ].map(({ text, icon, path }) => (
    <ListItem
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

        <div style={{ padding: open ? "16px" : "16px 8px" }}>
          <IconButton
            onClick={handleUserMenuOpen}
            style={{ color: "#ECF0F1" }}
          >
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
            PaperProps={{
              style: {
                background: "#2C3E50",
                color: "#ECF0F1",
              },
            }}
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