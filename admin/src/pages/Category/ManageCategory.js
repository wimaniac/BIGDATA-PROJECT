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

  const handleCloseDialog = () => {
    setOpen(false);
    setNewCategory("");
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await axios.post("http://localhost:5000/api/categories", {
        name: newCategory,
        parent: parentCategory ? parentCategory._id : null, // Đổi từ parentCategory -> parent
      });
      fetchCategories();
      handleCloseDialog();
      setSnackbar({ open: true, message: "Thêm danh mục thành công!", severity: "success" });
    } catch (error) {
      console.error("Lỗi thêm danh mục:", error);
      setSnackbar({ open: true, message: "Lỗi thêm danh mục!", severity: "error" });
    }
  };
  

  const handleDeleteCategory = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa danh mục này?")) {
      try {
        await axios.delete(`http://localhost:5000/api/categories/${id}`);
        fetchCategories();
        setSnackbar({ open: true, message: "Xóa danh mục thành công!", severity: "success" });
      } catch (error) {
        console.error("Lỗi xóa danh mục:", error);
        setSnackbar({ open: true, message: "Lỗi xóa danh mục!", severity: "error" });
      }
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
        {filteredCategories
          .filter((category) => !category.parentCategory)
          .map((parent) => (
            <div key={parent._id}>
              <ListItem button onClick={() => handleToggleCategory(parent._id)}>
                {openCategories[parent._id] ? <ExpandLess /> : <ExpandMore />}
                <ListItemText primary={parent.name} />
                <ListItemSecondaryAction>
                  <IconButton color="primary" onClick={() => handleOpenDialog(parent)}>
                    <Add />
                  </IconButton>
                  <IconButton color="secondary" onClick={() => alert("Sửa chưa triển khai!")}>
                    <Edit />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDeleteCategory(parent._id)}>
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              {/* Danh mục con */}
              {openCategories[parent._id] &&
                filteredCategories
                  .filter((sub) => sub.parentCategory === parent._id)
                  .map((child) => (
                    <ListItem key={child._id} sx={{ pl: 4 }}>
                      <ListItemText primary={`- ${child.name}`} />
                      <ListItemSecondaryAction>
                        <IconButton color="secondary" onClick={() => alert("Sửa chưa triển khai!")}>
                          <Edit />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteCategory(child._id)}>
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
        <DialogTitle>{parentCategory ? `Thêm danh mục con cho ${parentCategory.name}` : "Thêm danh mục mới"}</DialogTitle>
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
          <Button onClick={handleAddCategory} color="primary" variant="contained">
            Thêm
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
