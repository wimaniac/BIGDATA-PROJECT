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
import AccountInfo from "./pages/User/AccountInfo";
import UserManagement from "./pages/User/UserManagement";
import OrderManagement from "./pages/Order/OrderManagement";
import ManageDiscounts from "./pages/Discount/ManageDiscounts";
// Xóa ProtectedRoute
function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <Router>
      <IconButton onClick={toggleSidebar}>
        <MenuIcon />
      </IconButton>
      {isSidebarOpen && <Sidebar />}
      <Routes>
        <Route path="/" element={<Navigate to="/manage-products" />} />
        <Route path="/manage-products" element={<Products />} />
        <Route path="/manage-categories" element={<Categories />} />
        <Route path="/manage-suppliers" element={<Suppliers />} />
        <Route path="/manage-add-product" element={<AddProduct />} />
        <Route path="/manage-edit-product/:id" element={<EditProduct />} />
        <Route path="/account-info" element={<AccountInfo />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/manage-orders" element={<OrderManagement />} />
        <Route path="/manage-discounts" element={<ManageDiscounts />} />
      </Routes>
    </Router>
  );
}

export default App;