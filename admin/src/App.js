import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Sidebar from "./components/Sidebar";
import Products from "./pages/Product/ManageProducts";
import Categories from "./pages/Category/ManageCategory";
import Suppliers from "./pages/Supplier/ManageSuppliers";

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
      </Routes>
    </Router>
  );
}

export default App;
