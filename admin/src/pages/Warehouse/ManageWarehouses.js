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
} from "@mui/material";
import { Edit, Delete, Add } from "@mui/icons-material";
import axios from "axios";

const ManageWarehouses = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentWarehouse, setCurrentWarehouse] = useState({
    name: "",
    location: { street: "", ward: "", district: "", city: "", country: "Vietnam" },
    capacity: "",
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchWarehouses();
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

  const handleOpen = (warehouse = { name: "", location: {}, capacity: "" }) => {
    setCurrentWarehouse(warehouse._id ? warehouse : { 
      name: "", 
      location: { street: "", ward: "", district: "", city: "", country: "Vietnam" }, 
      capacity: "" 
    });
    setEditMode(!!warehouse._id);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentWarehouse({ name: "", location: {}, capacity: "" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentWarehouse((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setCurrentWarehouse((prev) => ({
      ...prev,
      location: { ...prev.location, [name]: value },
    }));
  };

  const handleSave = async () => {
    if (!currentWarehouse.name || !currentWarehouse.location.city) {
      alert("Tên kho và Thành phố là bắt buộc!");
      return;
    }

    try {
      const data = {
        name: currentWarehouse.name,
        location: currentWarehouse.location,
        capacity: currentWarehouse.capacity ? parseInt(currentWarehouse.capacity) : undefined,
      };

      if (editMode) {
        await axios.put(
          `http://localhost:5000/api/warehouses/${currentWarehouse._id}`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post("http://localhost:5000/api/warehouses", data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchWarehouses();
      handleClose();
    } catch (error) {
      console.error("Lỗi khi lưu kho:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra khi lưu kho!");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa kho này?")) {
      try {
        await axios.delete(`http://localhost:5000/api/warehouses/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchWarehouses();
      } catch (error) {
        console.error("Lỗi khi xóa kho:", error);
        alert(error.response?.data?.message || "Có lỗi xảy ra khi xóa kho!");
      }
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3, textAlign: "center" }}>
        Quản lý kho hàng
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        onClick={() => handleOpen()}
        sx={{ mb: 2 }}
      >
        Thêm kho mới
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: "#1976d2" }}>
            <TableRow>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Tên kho</TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Vị trí</TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Sức chứa</TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {warehouses.map((warehouse) => (
              <TableRow key={warehouse._id}>
                <TableCell>{warehouse.name}</TableCell>
                <TableCell>
                  {warehouse.location.street}, {warehouse.location.ward}, {warehouse.location.district}, {warehouse.location.city}
                </TableCell>
                <TableCell>{warehouse.capacity || "Không giới hạn"}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(warehouse)} color="primary">
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(warehouse._id)} color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog thêm/sửa kho */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editMode ? "Sửa thông tin kho" : "Thêm kho mới"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Tên kho"
            name="name"
            value={currentWarehouse.name}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Số nhà, tên đường"
            name="street"
            value={currentWarehouse.location.street}
            onChange={handleLocationChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Phường, Xã"
            name="ward"
            value={currentWarehouse.location.ward}
            onChange={handleLocationChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Quận, Huyện"
            name="district"
            value={currentWarehouse.location.district}
            onChange={handleLocationChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Thành phố"
            name="city"
            value={currentWarehouse.location.city}
            onChange={handleLocationChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Sức chứa"
            name="capacity"
            type="number"
            value={currentWarehouse.capacity}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            inputProps={{ min: 0 }}
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

export default ManageWarehouses;
