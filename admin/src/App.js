import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Sidebar from "./components/Sidebar";
import Products from "./pages/Product/ManageProducts";
import Categories from "./pages/Category/ManageCategory";
import Suppliers from "./pages/Supplier/ManageSuppliers";
import AddProduct from "./pages/Product/AddProduct";
import EditProduct from "./pages/Product/EditProduct";
import AccountInfo from "./components/AccountInfo";
import axios from "axios";

const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const allowedRoles = ["sales", "manager", "admin"];

  localStorage.setItem("debug_protectedRoute_user", JSON.stringify(user));
  console.log("ProtectedRoute - User:", user);

  if (!user || !allowedRoles.includes(user.role)) {
    localStorage.setItem("debug_redirect", "Redirecting to client homepage...");
    console.log("Redirecting to client homepage...");
    setTimeout(() => {
      window.location.href = "http://localhost:3000/";
    }, 2000);
    return <div>Redirecting to client...</div>;
  }

  return children;
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
  
    localStorage.setItem("debug_token", token || "No token found");
    console.log("Token from URL:", token);
  
    if (token && !localStorage.getItem("user")) {
      localStorage.setItem("debug_step", "Calling API /api/users/me");
      axios
        .get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          const user = response.data;
          localStorage.setItem("debug_user_fetched", JSON.stringify(user));
          localStorage.setItem("debug_step", "API call successful");
          console.log("User fetched from API:", user);
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(user));
          window.history.replaceState({}, document.title, "/manage-products");
        })
        .catch((error) => {
          const errorDetails = {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          };
          localStorage.setItem("debug_error", JSON.stringify(errorDetails));
          localStorage.setItem("debug_step", "API call failed");
          console.error("Error fetching user info:", errorDetails);
          // Không xóa user nếu API thất bại, để tránh mất dữ liệu nếu user đã đăng nhập trước đó
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      localStorage.setItem("debug_step", "No token or user already exists");
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <IconButton onClick={toggleSidebar}>
        <MenuIcon />
      </IconButton>
      {isSidebarOpen && <Sidebar />}
      <Routes>
        <Route path="/" element={<Navigate to="/manage-products" />} />
        <Route
          path="/manage-products"
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-categories"
          element={
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-suppliers"
          element={
            <ProtectedRoute>
              <Suppliers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-add-product"
          element={
            <ProtectedRoute>
              <AddProduct />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-edit-product/:id"
          element={
            <ProtectedRoute>
              <EditProduct />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account-info"
          element={
            <ProtectedRoute>
              <AccountInfo />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;