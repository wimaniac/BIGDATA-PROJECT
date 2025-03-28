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
  TablePagination,
  Box,
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
    warehouse: "",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchInventoryItems();
    fetchProducts();
    fetchParentCategories();
    fetchWarehouses();

    const handleInventoryUpdate = () => fetchInventoryItems();
    window.addEventListener("inventoryUpdated", handleInventoryUpdate);
    return () => window.removeEventListener("inventoryUpdated", handleInventoryUpdate);
  }, []);

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
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubCategories(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh mục con:", error);
      setSubCategories([]);
    }
  };

  const handleOpen = (item = { product: "", quantity: 1, price: 0, parentCategory: "", subCategory: "", warehouse: "" }) => {
    setCurrentItem(item);
    setEditMode(!!item._id);
    if (item.product) {
      const selectedProduct = products.find((p) => p._id === item.product.toString());
      if (selectedProduct) {
        setCurrentItem((prev) => ({
          ...prev,
          parentCategory: selectedProduct.parentCategory._id || "",
          subCategory: selectedProduct.subCategory?._id || "",
          warehouse: item.warehouse || "",
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
      setCurrentItem((prev) => ({ ...prev, [name]: Math.max(1, newQuantity) }));
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
      console.log("Dữ liệu gửi lên:", data);
      if (!token) throw new Error("Không tìm thấy token!");
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
      console.log("Chi tiết lỗi:", error.response);
      alert(error.response?.data?.message ? `Lỗi: ${error.response.data.message}` : "Có lỗi xảy ra khi lưu kho hàng!");
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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0); // Reset về trang đầu khi tìm kiếm
  };

  // Hàm chuyển đổi chuỗi có dấu sang không dấu
  const removeAccents = (str) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  // Gộp dữ liệu theo sản phẩm
  const groupedInventory = products
    .map((product) => {
      const items = inventoryItems.filter((item) => item.product.toString() === product._id);
      if (items.length === 0) return null;
      const warehouseQuantities = items.reduce((acc, item) => {
        const warehouse = warehouses.find((w) => w._id === item.warehouse?.toString());
        acc[warehouse?.name || "Không xác định"] = {
          quantity: item.quantity,
          id: item._id,
        };
        return acc;
      }, {});
      return {
        productName: product.name,
        warehouseQuantities,
      };
    })
    .filter((item) => item !== null);

  // Lọc theo tìm kiếm
  const filteredInventory = groupedInventory.filter((item) => {
    const search = removeAccents(searchTerm.trim());
    return search === "" || removeAccents(item.productName).includes(search);
  });

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
        Quản lý kho hàng
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Button variant="contained" color="primary" onClick={() => handleOpen()}>
          Thêm sản phẩm vào kho
        </Button>
        <TextField
          label="Tìm kiếm sản phẩm"
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ flexGrow: 1 }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sản phẩm</TableCell>
              {warehouses.map((warehouse) => (
                <TableCell key={warehouse._id} align="center">{warehouse.name}</TableCell>
              ))}
              <TableCell align="center">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInventory
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((item) => (
                <TableRow key={item.productName}>
                  <TableCell>{item.productName}</TableCell>
                  {warehouses.map((warehouse) => (
                    <TableCell key={warehouse._id} align="center">
                      {item.warehouseQuantities[warehouse.name]?.quantity || "-"}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    {Object.values(item.warehouseQuantities).map((data) => (
                      <Box key={data.id} sx={{ display: "inline-block", mx: 0.5 }}>
                        <IconButton size="small" onClick={() => handleOpen(inventoryItems.find(i => i._id === data.id))}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(data.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredInventory.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

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
            {subCategories.length === 0 && <MenuItem value="" disabled>Không có danh mục con</MenuItem>}
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