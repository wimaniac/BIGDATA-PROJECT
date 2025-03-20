import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  DialogContentText,
} from "@mui/material";
import { Add, Edit, Delete, ExpandLess, ExpandMore } from "@mui/icons-material";
import axios from "axios";

const ManageCategory = () => {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [parentCategory, setParentCategory] = useState(null);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [openCategories, setOpenCategories] = useState({});
  const [editCategory, setEditCategory] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, categoryId: null });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/categories");
      setCategories(response.data);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error("Lỗi lấy danh mục:", error);
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
    }
  };

  const handleOpenDialog = (parent = null) => {
    setParentCategory(parent);
    setOpen(true);
  };

  const handleOpenEditDialog = (category) => {
    setEditCategory(category);
    setNewCategory(category.name);
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setNewCategory("");
    setEditCategory(null);
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await axios.post("http://localhost:5000/api/categories", {
        name: newCategory,
        parent: parentCategory ? parentCategory._id : null, // Ensure correct parent assignment
      });
      fetchCategories();
      handleCloseDialog();
      setSnackbar({ open: true, message: "Thêm danh mục thành công!", severity: "success" });
    } catch (error) {
      console.error("Lỗi thêm danh mục:", error);
      setSnackbar({ open: true, message: "Lỗi thêm danh mục!", severity: "error" });
    }
  };

  const handleUpdateCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await axios.put(`http://localhost:5000/api/categories/${editCategory._id}`, {
        name: newCategory,
      });
      fetchCategories();
      handleCloseDialog();
      setSnackbar({ open: true, message: "Cập nhật danh mục thành công!", severity: "success" });
    } catch (error) {
      console.error("Lỗi cập nhật danh mục:", error);
      setSnackbar({ open: true, message: "Lỗi cập nhật danh mục!", severity: "error" });
    }
  };

  const handleOpenDeleteDialog = (id) => {
    setDeleteDialog({ open: true, categoryId: id });
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({ open: false, categoryId: null });
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:5000/api/categories/${deleteDialog.categoryId}`);
      fetchCategories();
      setSnackbar({ open: true, message: "Xóa danh mục thành công!", severity: "success" });
    } catch (error) {
      console.error("Lỗi xóa danh mục:", error);
      setSnackbar({ open: true, message: "Lỗi xóa danh mục!", severity: "error" });
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleToggleCategory = (id) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(search.toLowerCase())
  );

  const parentCategories = filteredCategories.filter((category) => !category.parent);
  const childCategories = filteredCategories.filter((category) => category.parent);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Quản lý danh mục
      </Typography>

      {error && (
        <Typography variant="body1" color="error" gutterBottom>
          {error}
        </Typography>
      )}

      {/* Thanh tìm kiếm */}
      <TextField
        label="Tìm kiếm danh mục..."
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Nút thêm danh mục */}
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        sx={{ mb: 3 }}
        onClick={() => handleOpenDialog()}
      >
        Thêm danh mục
      </Button>

      {/* Danh sách danh mục */}
      <List>
        {parentCategories.map((parent) => (
          <div key={parent._id}>
            <ListItem button onClick={() => handleToggleCategory(parent._id)}>
              {openCategories[parent._id] ? <ExpandLess /> : <ExpandMore />}
              <ListItemText primary={parent.name} />
              <ListItemSecondaryAction>
                <IconButton color="primary" onClick={() => handleOpenDialog(parent)}>
                  <Add />
                </IconButton>
                <IconButton color="secondary" onClick={() => handleOpenEditDialog(parent)}>
                  <Edit />
                </IconButton>
                <IconButton color="error" onClick={() => handleOpenDeleteDialog(parent._id)}>
                  <Delete />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
            {openCategories[parent._id] &&
              childCategories
                .filter((sub) => sub.parent === parent._id)
                .map((child) => (
                  <ListItem key={child._id} sx={{ pl: 4 }}>
                    <ListItemText primary={`- ${child.name}`} />
                    <ListItemSecondaryAction>
                      <IconButton color="secondary" onClick={() => handleOpenEditDialog(child)}>
                        <Edit />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleOpenDeleteDialog(child._id)}>
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
          </div>
        ))}
      </List>

      {/* Dialog thêm danh mục */}
      <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editCategory ? `Chỉnh sửa danh mục ${editCategory.name}` : parentCategory ? `Thêm danh mục con cho ${parentCategory.name}` : "Thêm danh mục mới"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Tên danh mục"
            variant="outlined"
            fullWidth
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Hủy
          </Button>
          <Button onClick={editCategory ? handleUpdateCategory : handleAddCategory} color="primary" variant="contained">
            {editCategory ? "Cập nhật" : "Thêm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xác nhận xóa danh mục */}
      <Dialog open={deleteDialog.open} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Xác nhận xóa danh mục</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa danh mục này?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="secondary">
            Hủy
          </Button>
          <Button onClick={handleConfirmDelete} color="primary" variant="contained">
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ManageCategory;
