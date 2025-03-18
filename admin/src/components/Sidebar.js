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
} from "@mui/material";
import {
  Category,
  LocalShipping,
  People,
  ShoppingCart,
  LocalOffer,
  Storage,
  Menu,
  ChevronLeft,
} from "@mui/icons-material";

const Sidebar = ({ children }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const toggleSidebar = () => {
    setOpen(!open);
  };

  const handleNavigation = (path) => {
    navigate(path);
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
        {open ? <ChevronLeft /> : <Menu />}
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
          },
        }}
      >
        {/* Tiêu đề Sidebar */}
        <div
          style={{
            padding: open ? "16px" : "16px 8px",
            textAlign: "center",
            transition: "opacity 0.3s",
          }}
        >
          {open && <Typography variant="h6">Dashboard</Typography>}
        </div>

        <Divider style={{ background: "#BDC3C7" }} />

        {/* Danh sách menu */}
        <List>
          {[
            { text: "Sản phẩm", icon: <Category />, path: "/products" },
            { text: "Danh mục", icon: <Category />, path: "/categories" },
            {
              text: "Nhà cung cấp",
              icon: <LocalShipping />,
              path: "/suppliers",
            },
            { text: "Người dùng", icon: <People />, path: "/users" },
            { text: "Đơn hàng", icon: <ShoppingCart />, path: "/orders" },
            { text: "Giảm giá", icon: <LocalOffer />, path: "/discounts" },
            { text: "Kho hàng", icon: <Storage />, path: "/inventory" },
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
