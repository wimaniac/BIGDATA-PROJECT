import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  CardMedia,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [productData, setProductData] = useState({
    name: "",
    price: "",
    parentCategory: "",
    subCategory: "",
    supplier: "",
    stock: "",
    unit: "",
    description: "",
    details: "",
    mainImage: "",
    additionalImages: [],
  });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedMainImage, setSelectedMainImage] = useState(null);
  const [selectedAdditionalImages, setSelectedAdditionalImages] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);

  useEffect(() => {
    fetchProduct();
    fetchCategories();
    fetchSuppliers();
  }, []);
  const fetchProduct = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/products/${id}`
      );
      console.log("📩 Dữ liệu sản phẩm từ API:", response.data);

      setProductData({
        ...response.data,
        parentCategory: response.data.parentCategory?._id || "",
        subCategory: response.data.subCategory?._id || "",
        supplier: response.data.supplier?._id || "", // Đảm bảo supplier là _id
      });

      fetchSubcategories(response.data.parentCategory?._id);
    } catch (error) {
      console.error("Lỗi lấy thông tin sản phẩm:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/categories/parents"
      );
      setCategories(response.data);
    } catch (error) {
      console.error("Lỗi lấy danh mục chính:", error);
    }
  };

  const fetchSubcategories = async (parentCategoryId) => {
    if (!parentCategoryId) return;
    try {
      const response = await axios.get(
        `http://localhost:5000/api/categories/subcategories/${parentCategoryId}`
      );
      setSubcategories(response.data);
    } catch (error) {
      console.error("Lỗi lấy danh mục phụ:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/suppliers");
      console.log("📩 Danh sách nhà cung cấp từ API:", response.data); // Kiểm tra dữ liệu trả về
      setSuppliers(response.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách nhà cung cấp:", error);
    }
  };

  const handleUpdateProduct = async () => {
    try {
      const formData = new FormData();
      Object.keys(productData).forEach((key) => {
        if (key !== "mainImage" && key !== "additionalImages" && key !== "stock") { // Loại bỏ stock
          formData.append(key, productData[key]);
        }
      });
  
      if (removeImages.length > 0) {
        formData.append("removeAdditionalImages", JSON.stringify(removeImages));
      }
      if (selectedMainImage) {
        formData.append("mainImage", selectedMainImage);
      }
      selectedAdditionalImages.forEach((image) => {
        formData.append("additionalImages", image);
      });
  
      console.log("📤 Gửi dữ liệu cập nhật:", formData);
  
      await axios.put(`http://localhost:5000/api/products/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      alert("Cập nhật sản phẩm thành công!");
      navigate("/products");
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật sản phẩm:", error);
      alert(error.response?.data?.message || "Cập nhật sản phẩm thất bại!");
    }
  };
  
  
  const handleReplaceImage = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      const updatedImages = [...selectedAdditionalImages];
      updatedImages[index] = file; // Cập nhật file ảnh phụ tại vị trí index
      setSelectedAdditionalImages(updatedImages);
  
      const imageUrl = URL.createObjectURL(file);
      const updatedImageUrls = [...productData.additionalImages];
      updatedImageUrls[index] = imageUrl; // Cập nhật URL ảnh phụ tại vị trí index
      setProductData((prev) => ({ ...prev, additionalImages: updatedImageUrls }));
    }
  };
  
  const handleAddAdditionalImages = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file) => URL.createObjectURL(file));
    setProductData((prev) => ({
      ...prev,
      additionalImages: [...prev.additionalImages, ...newImages],
    }));
    setSelectedAdditionalImages((prev) => [...prev, ...files]); // Thêm file ảnh mới vào state
  };
  
  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedMainImage(file);
      const imageUrl = URL.createObjectURL(file); // Tạo URL hiển thị ngay lập tức
      setProductData((prev) => ({ ...prev, mainImage: imageUrl }));
    }
  };

  const handleRemoveImage = (index) => {
    const imageToRemove = productData.additionalImages[index];
    setRemoveImages((prev) => [...prev, imageToRemove]); // Lưu ảnh vào danh sách cần xóa
  
    // Cập nhật UI
    const updatedImages = [...productData.additionalImages];
    updatedImages.splice(index, 1);
    setProductData({ ...productData, additionalImages: updatedImages });
  
    // Xóa luôn trong danh sách file ảnh mới chọn
    const updatedSelectedImages = [...selectedAdditionalImages];
    updatedSelectedImages.splice(index, 1);
    setSelectedAdditionalImages(updatedSelectedImages);
  };
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Chỉnh sửa sản phẩm
      </Typography>
      {/* Ảnh chính */}
      {/* Ảnh chính */}
      <Typography variant="h6" sx={{ mt: 2 }}>
        Ảnh chính
      </Typography>
      <CardMedia
        component="img"
        height="250"
        sx={{ borderRadius: 2, objectFit: "contain" }}
        image={productData.mainImage || "https://via.placeholder.com/250"}
        alt="Ảnh chính"
      />
      <Button variant="contained" component="label" sx={{ mt: 1 }}>
        Chọn ảnh chính
        <input type="file" hidden onChange={handleMainImageChange} />
      </Button>

      {/* Ảnh phụ */}
      <Typography variant="h6" sx={{ mt: 2 }}>
        Ảnh phụ
      </Typography>
      <Grid container spacing={2}>
        {productData.additionalImages?.map((img, index) => (
          <Grid
            item
            key={index}
            sx={{ position: "relative", textAlign: "center" }}
          >
            <CardMedia
              component="img"
              height="150"
              sx={{
                width: "150px",
                borderRadius: 2,
                objectFit: "cover",
                border: "2px solid #ddd",
              }}
              image={img}
              alt={`Ảnh phụ ${index + 1}`}
            />
            <div style={{ marginTop: "8px" }}>
              {/* Nút thay thế ảnh */}
              <Button variant="contained" component="label" size="small">
                Upload
                <input
                  type="file"
                  hidden
                  onChange={(e) => handleReplaceImage(e, index)}
                />
              </Button>
              {/* Nút xóa ảnh */}
              <Button
                variant="outlined"
                color="error"
                size="small"
                sx={{ ml: 1 }}
                onClick={() => handleRemoveImage(index)}
              >
                Xóa
              </Button>
            </div>
          </Grid>
        ))}
      </Grid>

      {/* Nút thêm ảnh phụ */}
      <Button variant="contained" component="label" sx={{ mt: 2 }}>
        Thêm ảnh phụ
        <input
          type="file"
          multiple
          hidden
          onChange={handleAddAdditionalImages}
        />
      </Button>

      {/* Tên sản phẩm */}
      <TextField
        label="Tên sản phẩm"
        variant="outlined"
        fullWidth
        sx={{ mb: 2, mt: 2 }}
        value={productData.name}
        onChange={(e) =>
          setProductData({ ...productData, name: e.target.value })
        }
      />

      <Grid container spacing={2}>
        {/* Giá */}
        <Grid item xs={6}>
          <TextField
            label="Giá"
            variant="outlined"
            fullWidth
            type="number"
            value={productData.price}
            onChange={(e) =>
              setProductData({ ...productData, price: e.target.value })
            }
          />
        </Grid>

      </Grid>

      {/* Chọn danh mục chính */}
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Danh mục chính</InputLabel>
        <Select
          value={productData.parentCategory}
          onChange={(e) => {
            setProductData({
              ...productData,
              parentCategory: e.target.value,
              subCategory: "",
            });
            fetchSubcategories(e.target.value);
          }}
        >
          {categories.map((category) => (
            <MenuItem key={category._id} value={category._id}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Chọn danh mục phụ */}
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Danh mục phụ</InputLabel>
        <Select
          value={productData.subCategory}
          onChange={(e) =>
            setProductData({ ...productData, subCategory: e.target.value })
          }
        >
          {subcategories.map((subcategory) => (
            <MenuItem key={subcategory._id} value={subcategory._id}>
              {subcategory.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {/* Chọn nhà cung cấp */}
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Nhà cung cấp</InputLabel>
        <Select
          value={productData.supplier}
          onChange={(e) =>
            setProductData({ ...productData, supplier: e.target.value })
          }
        >
          {suppliers.map((supplier) => (
            <MenuItem key={supplier._id} value={supplier._id}>
              {supplier.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {/* Mô tả sản phẩm */}
      <TextField
        label="Mô tả sản phẩm"
        variant="outlined"
        fullWidth
        multiline
        rows={3}
        sx={{ mt: 2 }}
        value={productData.description}
        onChange={(e) =>
          setProductData({ ...productData, description: e.target.value })
        }
      />

      {/* Thông tin chi tiết */}
      <TextField
        label="Thông tin chi tiết"
        variant="outlined"
        fullWidth
        multiline
        rows={4}
        sx={{ mt: 2 }}
        value={productData.details}
        onChange={(e) =>
          setProductData({ ...productData, details: e.target.value })
        }
      />

      {/* Nút cập nhật */}
      <Button
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 3 }}
        onClick={handleUpdateProduct}
      >
        Cập nhật sản phẩm
      </Button>
    </Container>
  );
};

export default EditProduct;
