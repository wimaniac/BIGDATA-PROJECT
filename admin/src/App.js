import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Sidebar from "./components/Sidebar";
import Products from "./pages/Product/ManageProducts";
import Categories from "./pages/Category/ManageCategory";
import Suppliers from "./pages/Supplier/ManageSuppliers";
import AddProduct from "./pages/Product/AddProduct";
import EditProduct from "./pages/Product/EditProduct"; // ✅ Đổi tên import từ UpdateProduct thành EditProduct

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
        <Route path="/products" element={<Products />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/add-product" element={<AddProduct />} />
        <Route path="/edit-product/:id" element={<EditProduct />} /> 
      </Routes>
    </Router>
  );
}

export default App;
