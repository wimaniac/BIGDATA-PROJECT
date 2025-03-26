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
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(4),
  boxShadow: theme.shadows[3],
}));

const ManageDiscounts = () => {
  const [discounts, setDiscounts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDiscount, setCurrentDiscount] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: 0,
    minPurchase: 0,
    maxDiscount: "",
    applicableProducts: [],
    applicableCategories: [],
    startDate: "",
    endDate: "",
    isActive: true,
  });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    fetchDiscounts();
    fetchProducts();
    fetchCategories();  }, []);
    const fetchProducts = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/products");
        setProducts(response.data);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách sản phẩm:", error);
      }
    };
    
    const fetchCategories = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/categories");
        setCategories(response.data);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách danh mục:", error);
      }
    };
  const fetchDiscounts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/discounts", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setDiscounts(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách giảm giá:", error);
      alert("Có lỗi xảy ra khi lấy danh sách giảm giá!");
    }
  };

  const handleOpenDialog = (discount = null) => {
    if (discount) {
      setEditMode(true);
      setCurrentDiscount({
        ...discount,
        startDate: discount.startDate.split("T")[0], // Chuyển định dạng cho input date
        endDate: discount.endDate.split("T")[0],
      });
    } else {
      setEditMode(false);
      setCurrentDiscount({
        code: "",
        description: "",
        discountType: "percentage",
        discountValue: 0,
        minPurchase: 0,
        maxDiscount: "",
        applicableProducts: [],
        applicableCategories: [],
        startDate: "",
        endDate: "",
        isActive: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentDiscount((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveDiscount = async () => {
    try {
      const discountData = {
        ...currentDiscount,
      maxDiscount: currentDiscount.maxDiscount ? parseFloat(currentDiscount.maxDiscount) : null,
      discountValue: parseFloat(currentDiscount.discountValue),
      minPurchase: parseFloat(currentDiscount.minPurchase),
      applicableProducts: currentDiscount.applicableProducts || [],
      applicableCategories: currentDiscount.applicableCategories || [],
      };

      if (editMode) {
        await axios.put(
          `http://localhost:5000/api/discounts/${currentDiscount._id}`,
          discountData,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        alert("Cập nhật giảm giá thành công!");
      } else {
        await axios.post("http://localhost:5000/api/discounts", discountData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        alert("Thêm giảm giá thành công!");
      }
      fetchDiscounts();
      handleCloseDialog();
    } catch (error) {
      console.error("Lỗi khi lưu giảm giá:", error);
      alert("Có lỗi xảy ra khi lưu giảm giá: " + (error.response?.data.message || error.message));
    }
  };

  const handleDeleteDiscount = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa giảm giá này không?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/discounts/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      alert("Xóa giảm giá thành công!");
      fetchDiscounts();
    } catch (error) {
      console.error("Lỗi khi xóa giảm giá:", error);
      alert("Có lỗi xảy ra khi xóa giảm giá!");
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
        Quản lý giảm giá
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => handleOpenDialog()}
        sx={{ mb: 2 }}
      >
        Thêm giảm giá mới
      </Button>

      <StyledTableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã giảm giá</TableCell>
              <TableCell>Loại</TableCell>
              <TableCell>Giá trị</TableCell>
              <TableCell>Ngày bắt đầu</TableCell>
              <TableCell>Ngày kết thúc</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {discounts.map((discount) => (
              <TableRow key={discount._id}>
                <TableCell>{discount.code}</TableCell>
                <TableCell>{discount.discountType === "percentage" ? "Phần trăm" : "Cố định"}</TableCell>
                <TableCell>
                  {discount.discountType === "percentage"
                    ? `${discount.discountValue}%`
                    : `${discount.discountValue.toLocaleString()} VNĐ`}
                </TableCell>
                <TableCell>{new Date(discount.startDate).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(discount.endDate).toLocaleDateString()}</TableCell>
                <TableCell>{discount.isActive ? "Hoạt động" : "Không hoạt động"}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(discount)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteDiscount(discount._id)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>

      {/* Dialog thêm/sửa giảm giá */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editMode ? "Chỉnh sửa giảm giá" : "Thêm giảm giá mới"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Mã giảm giá"
            name="code"
            value={currentDiscount.code}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Mô tả"
            name="description"
            value={currentDiscount.description}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Loại giảm giá</InputLabel>
            <Select
              name="discountType"
              value={currentDiscount.discountType}
              onChange={handleInputChange}
              label="Loại giảm giá"
            >
              <MenuItem value="percentage">Phần trăm</MenuItem>
              <MenuItem value="fixed">Cố định</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Giá trị giảm"
            name="discountValue"
            type="number"
            value={currentDiscount.discountValue}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Tổng tiền tối thiểu"
            name="minPurchase"
            type="number"
            value={currentDiscount.minPurchase}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          {currentDiscount.discountType === "percentage" && (
            <TextField
              label="Giới hạn tối đa"
              name="maxDiscount"
              type="number"
              value={currentDiscount.maxDiscount}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />
          )}
         <FormControl fullWidth margin="normal">
    <InputLabel>Sản phẩm áp dụng</InputLabel>
    <Select
      multiple
      name="applicableProducts"
      value={currentDiscount.applicableProducts}
      onChange={(e) =>
        setCurrentDiscount((prev) => ({
          ...prev,
          applicableProducts: e.target.value,
        }))
      }
      renderValue={(selected) =>
        products
          .filter((p) => selected.includes(p._id))
          .map((p) => p.name)
          .join(", ")
      }
    >
      {products.map((product) => (
        <MenuItem key={product._id} value={product._id}>
          {product.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl>

  {/* Chọn danh mục áp dụng */}
  <FormControl fullWidth margin="normal">
    <InputLabel>Danh mục áp dụng</InputLabel>
    <Select
      multiple
      name="applicableCategories"
      value={currentDiscount.applicableCategories}
      onChange={(e) =>
        setCurrentDiscount((prev) => ({
          ...prev,
          applicableCategories: e.target.value,
        }))
      }
      renderValue={(selected) =>
        categories
          .filter((c) => selected.includes(c._id))
          .map((c) => c.name)
          .join(", ")
      }
    >
      {categories.map((category) => (
        <MenuItem key={category._id} value={category._id}>
          {category.name}
        </MenuItem>
      ))}
    </Select>
  </FormControl> <TextField
            label="Ngày bắt đầu"
            name="startDate"
            type="date"
            value={currentDiscount.startDate}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            label="Ngày kết thúc"
            name="endDate"
            type="date"
            value={currentDiscount.endDate}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Trạng thái</InputLabel>
            <Select
              name="isActive"
              value={currentDiscount.isActive}
              onChange={(e) => handleInputChange({ target: { name: "isActive", value: e.target.value === "true" } })}
              label="Trạng thái"
            >
              <MenuItem value={true}>Hoạt động</MenuItem>
              <MenuItem value={false}>Không hoạt động</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Hủy
          </Button>
          <Button onClick={handleSaveDiscount} color="primary">
            {editMode ? "Cập nhật" : "Thêm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ManageDiscounts;