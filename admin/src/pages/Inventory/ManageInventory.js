import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  MenuItem,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import axios from "axios";

const ManageInventory = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState({
    product: "",
    quantity: 1,
    price: 0,
    parentCategory: "",
    subCategory: "",
    warehouse: "", // Thêm trường warehouse
  });
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchInventoryItems();
    fetchProducts();
    fetchParentCategories();
    fetchWarehouses();
  
    // Lắng nghe sự kiện cập nhật tồn kho
    const handleInventoryUpdate = () => fetchInventoryItems();
    window.addEventListener("inventoryUpdated", handleInventoryUpdate);
    return () => window.removeEventListener("inventoryUpdated", handleInventoryUpdate);
  }, []);
  
  // Phát sự kiện từ Checkout.js
  // Trong handleCheckout, sau khi gọi process-inventory thành công:
  window.dispatchEvent(new Event("inventoryUpdated"));

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/warehouses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWarehouses(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách kho:", error);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/inventory", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventoryItems(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách kho hàng:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    }
  };

  const fetchParentCategories = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/categories/parents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setParentCategories(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh mục cha:", error);
    }
  };

  const fetchSubCategories = async (parentId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/categories/subcategories/${parentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSubCategories(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh mục con:", error);
      setSubCategories([]);
    }
  };

  const handleOpen = (
    item = { product: "", quantity: 1, price: 0, parentCategory: "", subCategory: "", warehouse: "" }
  ) => {
    setCurrentItem(item);
    setEditMode(!!item._id);
    if (item.product) {
      const selectedProduct = products.find((p) => p._id === item.product.toString());
      if (selectedProduct) {
        setCurrentItem((prev) => ({
          ...prev,
          parentCategory: selectedProduct.parentCategory._id || "",
          subCategory: selectedProduct.subCategory?._id || "",
          warehouse: item.warehouse || "", // Điền warehouse nếu có
        }));
        fetchSubCategories(selectedProduct.parentCategory._id);
      }
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSubCategories([]);
    setCurrentItem({ product: "", quantity: 1, price: 0, parentCategory: "", subCategory: "", warehouse: "" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "quantity") {
      const newQuantity = parseInt(value) || 1;
      setCurrentItem((prev) => ({
        ...prev,
        [name]: Math.max(1, newQuantity),
      }));
    } else {
      setCurrentItem((prev) => ({ ...prev, [name]: value }));
    }

    if (name === "parentCategory") {
      fetchSubCategories(value);
      setCurrentItem((prev) => ({ ...prev, subCategory: "" }));
    }

    if (name === "product") {
      const selectedProduct = products.find((p) => p._id === value);
      if (selectedProduct) {
        setCurrentItem((prev) => ({
          ...prev,
          price: selectedProduct.discountedPrice || selectedProduct.price,
          parentCategory: selectedProduct.parentCategory._id || "",
          subCategory: selectedProduct.subCategory?._id || "",
        }));
        fetchSubCategories(selectedProduct.parentCategory._id);
      }
    }
  };

  const handleSave = async () => {
    if (currentItem.quantity < 1) {
      alert("Số lượng phải lớn hơn hoặc bằng 1!");
      return;
    }
    if (!currentItem.warehouse) {
      alert("Vui lòng chọn kho!");
      return;
    }
    

    try {
      const data = {
        product: currentItem.product,
        quantity: parseInt(currentItem.quantity),
        price: parseFloat(currentItem.price),
        category: currentItem.parentCategory,
        warehouse: currentItem.warehouse, 
      };

      if (editMode) {
        await axios.put(`http://localhost:5000/api/inventory/${currentItem._id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("http://localhost:5000/api/inventory", data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchInventoryItems();
      handleClose();
    } catch (error) {
      console.error("Lỗi khi lưu kho hàng:", error);
      alert("Có lỗi xảy ra khi lưu kho hàng!");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa mục này?")) {
      try {
        await axios.delete(`http://localhost:5000/api/inventory/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchInventoryItems();
      } catch (error) {
        console.error("Lỗi khi xóa kho hàng:", error);
        alert("Có lỗi xảy ra khi xóa kho hàng!");
      }
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
        Quản lý kho hàng
      </Typography>
      <Button variant="contained" color="primary" onClick={() => handleOpen()} sx={{ mb: 2 }}>
        Thêm sản phẩm vào kho
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sản phẩm</TableCell>
              <TableCell>Số lượng</TableCell>
              <TableCell>Giá</TableCell>
              <TableCell>Danh mục cha</TableCell>
              <TableCell>Danh mục con</TableCell>
              <TableCell>Kho</TableCell> {/* Thêm cột kho */}
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventoryItems.map((item) => {
              const product = products.find((p) => p._id === item.product.toString());
              const warehouse = warehouses.find((w) => w._id === item.warehouse?.toString());
              return (
                <TableRow key={item._id}>
                  <TableCell>{product?.name || "Không xác định"}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.price.toLocaleString()} VNĐ</TableCell>
                  <TableCell>{product?.parentCategory?.name || "Không xác định"}</TableCell>
                  <TableCell>{product?.subCategory?.name || "Không có"}</TableCell>
                  <TableCell>{warehouse?.name || "Không xác định"}</TableCell> {/* Hiển thị tên kho */}
                  <TableCell>
                    <IconButton onClick={() => handleOpen(item)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(item._id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog thêm/sửa sản phẩm trong kho */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editMode ? "Sửa thông tin kho" : "Thêm sản phẩm vào kho"}</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Danh mục cha"
            name="parentCategory"
            value={currentItem.parentCategory}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            required
          >
            {parentCategories.map((category) => (
              <MenuItem key={category._id} value={category._id}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Danh mục con"
            name="subCategory"
            value={currentItem.subCategory}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            disabled={!currentItem.parentCategory || subCategories.length === 0}
          >
            {subCategories.map((sub) => (
              <MenuItem key={sub._id} value={sub._id}>
                {sub.name}
              </MenuItem>
            ))}
            {subCategories.length === 0 && (
              <MenuItem value="" disabled>
                Không có danh mục con
              </MenuItem>
            )}
          </TextField>
          <TextField
            select
            label="Sản phẩm"
            name="product"
            value={currentItem.product}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            required
          >
            {products
              .filter(
                (p) =>
                  (!currentItem.parentCategory || p.parentCategory._id === currentItem.parentCategory) &&
                  (!currentItem.subCategory || p.subCategory?._id === currentItem.subCategory)
              )
              .map((product) => (
                <MenuItem key={product._id} value={product._id}>
                  {product.name}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            select
            label="Kho"
            name="warehouse"
            value={currentItem.warehouse}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            required
          >
            {warehouses.map((warehouse) => (
              <MenuItem key={warehouse._id} value={warehouse._id}>
                {warehouse.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Số lượng"
            name="quantity"
            type="number"
            value={currentItem.quantity}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            required
            inputProps={{ min: 1 }}
          />
          <TextField
            label="Giá"
            name="price"
            type="number"
            value={currentItem.price}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Hủy</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ManageInventory;