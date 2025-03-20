import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import axios from "axios";

const ManageSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [deleteSupplierId, setDeleteSupplierId] = useState(null);
  const [supplierData, setSupplierData] = useState({ name: "", email: "", phone: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/suppliers");
      setSuppliers(response.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách nhà cung cấp:", error);
    }
  };

  const handleOpenDialog = (supplier = null) => {
    setEditSupplier(supplier);
    setSupplierData(supplier ? { name: supplier.name, email: supplier.email, phone: supplier.phone } : { name: "", email: "", phone: "" });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditSupplier(null);
  };

  const handleOpenDeleteDialog = (id) => {
    setDeleteSupplierId(id);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setDeleteSupplierId(null);
  };

  const handleSaveSupplier = async () => {
    try {
      if (editSupplier) {
        await axios.put(`http://localhost:5000/api/suppliers/${editSupplier._id}`, supplierData);
        setSnackbar({ open: true, message: "Cập nhật nhà cung cấp thành công!", severity: "success" });
      } else {
        await axios.post("http://localhost:5000/api/suppliers", supplierData);
        setSnackbar({ open: true, message: "Thêm nhà cung cấp thành công!", severity: "success" });
      }
      fetchSuppliers();
      handleCloseDialog();
    } catch (error) {
      console.error("Lỗi khi lưu nhà cung cấp:", error);
      setSnackbar({ open: true, message: "Lỗi khi lưu nhà cung cấp!", severity: "error" });
    }
  };

  const handleDeleteSupplier = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/suppliers/${deleteSupplierId}`);
      fetchSuppliers();
      setSnackbar({ open: true, message: "Xóa nhà cung cấp thành công!", severity: "success" });
    } catch (error) {
      console.error("Lỗi khi xóa nhà cung cấp:", error);
      setSnackbar({ open: true, message: "Lỗi khi xóa nhà cung cấp!", severity: "error" });
    }
    handleCloseDeleteDialog();
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Quản lý nhà cung cấp
      </Typography>

      {/* Thanh tìm kiếm */}
      <TextField
        label="Tìm kiếm nhà cung cấp..."
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Nút thêm nhà cung cấp */}
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        sx={{ mb: 3 }}
        onClick={() => handleOpenDialog()}
      >
        Thêm nhà cung cấp
      </Button>

      {/* Bảng danh sách nhà cung cấp */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tên</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Điện thoại</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSuppliers.map((supplier) => (
              <TableRow key={supplier._id}>
                <TableCell>{supplier.name}</TableCell>
                <TableCell>{supplier.email}</TableCell>
                <TableCell>{supplier.phone}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenDialog(supplier)}>
                    <Edit />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleOpenDeleteDialog(supplier._id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog thêm/sửa nhà cung cấp */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editSupplier ? "Chỉnh sửa nhà cung cấp" : "Thêm nhà cung cấp"}</DialogTitle>
        <DialogContent>
          <TextField label="Tên" variant="outlined" fullWidth sx={{ mb: 2 }} value={supplierData.name} onChange={(e) => setSupplierData({ ...supplierData, name: e.target.value })} />
          <TextField label="Email" variant="outlined" fullWidth sx={{ mb: 2 }} value={supplierData.email} onChange={(e) => setSupplierData({ ...supplierData, email: e.target.value })} />
          <TextField label="Số điện thoại" variant="outlined" fullWidth sx={{ mb: 2 }} value={supplierData.phone} onChange={(e) => setSupplierData({ ...supplierData, phone: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">Hủy</Button>
          <Button onClick={handleSaveSupplier} color="primary" variant="contained">Lưu</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xác nhận xóa */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>Bạn có chắc chắn muốn xóa nhà cung cấp này?</DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="secondary">Hủy</Button>
          <Button onClick={handleDeleteSupplier} color="error" variant="contained">Xóa</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar thông báo */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};

export default ManageSuppliers;
