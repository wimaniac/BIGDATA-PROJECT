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
import { Edit, Delete } from "@mui/icons-material";
import axios from "axios";

const ManageWarehouses = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentWarehouse, setCurrentWarehouse] = useState({
    name: "",
    location: "",
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

  const handleOpen = (warehouse = { name: "", location: "", capacity: "" }) => {
    setCurrentWarehouse(warehouse);
    setEditMode(!!warehouse._id);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentWarehouse({ name: "", location: "", capacity: "" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentWarehouse((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!currentWarehouse.name) {
      alert("Tên kho là bắt buộc!");
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
      alert("Có lỗi xảy ra khi lưu kho!");
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
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
        Quản lý kho hàng
      </Typography>
      <Button variant="contained" color="primary" onClick={() => handleOpen()} sx={{ mb: 2 }}>
        Thêm kho mới
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tên kho</TableCell>
              <TableCell>Vị trí</TableCell>
              <TableCell>Sức chứa</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {warehouses.map((warehouse) => (
              <TableRow key={warehouse._id}>
                <TableCell>{warehouse.name}</TableCell>
                <TableCell>{warehouse.location || "Không xác định"}</TableCell>
                <TableCell>{warehouse.capacity || "Không giới hạn"}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(warehouse)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(warehouse._id)}>
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
            label="Vị trí"
            name="location"
            value={currentWarehouse.location}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
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