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
import { useNavigate } from "react-router-dom"; // Thêm useNavigate để điều hướng

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
  const [userRole, setUserRole] = useState(null); // Thêm state để lưu vai trò người dùng
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserRole(); // Lấy vai trò người dùng
    fetchCategories();
  }, []);

  const fetchUserRole = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserRole(response.data.role);
    } catch (error) {
      console.error("Lỗi lấy thông tin người dùng:", error);
      if (error.response?.status === 401) {
        alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
        navigate("/login");
      }
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/categories", {
        headers: { Authorization: `Bearer ${token}` }, // Thêm token để xác thực
      });
      setCategories(response.data);
      setError(null);
    } catch (error) {
      console.error("Lỗi lấy danh mục:", error);
      setError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
    }
  };

  const handleOpenDialog = (parent = null) => {
    if (userRole === "sales") return; // Không cho sales mở dialog thêm danh mục
    setParentCategory(parent);
    setOpen(true);
  };

  const handleOpenEditDialog = (category) => {
    if (userRole === "sales") return; // Không cho sales chỉnh sửa
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
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/categories",
        {
          name: newCategory,
          parent: parentCategory ? parentCategory._id : null,
        },
        { headers: { Authorization: `Bearer ${token}` } } // Thêm token
      );
      fetchCategories();
      handleCloseDialog();
      setSnackbar({ open: true, message: "Thêm danh mục thành công!", severity: "success" });
    } catch (error) {
      console.error("Lỗi thêm danh mục:", error);
      let errorMessage = "Lỗi thêm danh mục!";
      if (error.response?.data?.code === 11000) {
        errorMessage = "Tên danh mục đã tồn tại!";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    }
  };

  const handleUpdateCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/categories/${editCategory._id}`,
        { name: newCategory },
        { headers: { Authorization: `Bearer ${token}` } } // Thêm token
      );
      fetchCategories();
      handleCloseDialog();
      setSnackbar({ open: true, message: "Cập nhật danh mục thành công!", severity: "success" });
    } catch (error) {
      console.error("Lỗi cập nhật danh mục:", error);
      setSnackbar({ open: true, message: "Lỗi cập nhật danh mục!", severity: "error" });
    }
  };

  const handleOpenDeleteDialog = (id) => {
    if (userRole === "sales") return; // Không cho sales xóa
    setDeleteDialog({ open: true, categoryId: id });
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({ open: false, categoryId: null });
  };

  const handleConfirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/categories/${deleteDialog.categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }, // Thêm token
      });
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

      <TextField
        label="Tìm kiếm danh mục..."
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Chỉ hiển thị nút "Thêm danh mục" nếu không phải sales */}
      {userRole !== "sales" && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          sx={{ mb: 3 }}
          onClick={() => handleOpenDialog()}
        >
          Thêm danh mục
        </Button>
      )}

      <List>
        {parentCategories.map((parent) => (
          <div key={parent._id}>
            <ListItem button onClick={() => handleToggleCategory(parent._id)}>
              {openCategories[parent._id] ? <ExpandLess /> : <ExpandMore />}
              <ListItemText primary={parent.name} />
              <ListItemSecondaryAction>
                {/* Chỉ hiển thị các nút nếu không phải sales */}
                {userRole !== "sales" && (
                  <>
                    <IconButton color="primary" onClick={() => handleOpenDialog(parent)}>
                      <Add />
                    </IconButton>
                    <IconButton color="secondary" onClick={() => handleOpenEditDialog(parent)}>
                      <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleOpenDeleteDialog(parent._id)}>
                      <Delete />
                    </IconButton>
                  </>
                )}
              </ListItemSecondaryAction>
            </ListItem>
            {openCategories[parent._id] &&
              childCategories
                .filter((sub) => sub.parent.toString() === parent._id.toString())
                .map((child) => (
                  <ListItem key={child._id} sx={{ pl: 4 }}>
                    <ListItemText primary={`- ${child.name}`} />
                    <ListItemSecondaryAction>
                      {/* Chỉ hiển thị các nút nếu không phải sales */}
                      {userRole !== "sales" && (
                        <>
                          <IconButton
                            color="secondary"
                            onClick={() => handleOpenEditDialog(child)}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDeleteDialog(child._id)}
                          >
                            <Delete />
                          </IconButton>
                        </>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
          </div>
        ))}
      </List>

      {/* Dialog thêm/chỉnh sửa danh mục */}
      {userRole !== "sales" && (
        <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editCategory
              ? `Chỉnh sửa danh mục ${editCategory.name}`
              : parentCategory
              ? `Thêm danh mục con cho ${parentCategory.name}`
              : "Thêm danh mục mới"}
          </DialogTitle>
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
            <Button
              onClick={editCategory ? handleUpdateCategory : handleAddCategory}
              color="primary"
              variant="contained"
            >
              {editCategory ? "Cập nhật" : "Thêm"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Dialog xác nhận xóa danh mục */}
      {userRole !== "sales" && (
        <Dialog open={deleteDialog.open} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Xác nhận xóa danh mục</DialogTitle>
          <DialogContent>
            <DialogContentText>Bạn có chắc chắn muốn xóa danh mục này?</DialogContentText>
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
      )}

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ManageCategory;