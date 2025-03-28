import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  IconButton,
  CircularProgress,
  FormHelperText,
  Card,
  CardMedia,
} from "@mui/material";
import { Editor } from "react-draft-wysiwyg";
import { EditorState, convertToRaw } from "draft-js";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AddProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [parentCategories, setParentCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [loadingData, setLoadingData] = useState({
    categories: false,
    suppliers: false,
    subCategories: false
  });
  
  // Form data state
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    parentCategory: "",
    subCategory: "",
    supplier: "",
    stock: 0,
    mainImage: null,
    additionalImages: [],
    details: "",
    isFeature: false,
    unit: "", // Đơn vị tính
    description: "", // Mô tả sản phẩm
  });
  
  // Form validation errors
  const [errors, setErrors] = useState({});
  
  // Preview images
  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState([]);

  // Fetch parent categories, suppliers on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingData({
        categories: true,
        suppliers: true,
        subCategories: false
      });
      
      try {
        // Fetch parent categories
        const categoriesResponse = await axios.get("http://localhost:5000/api/categories/parents");
        console.log("Parent categories data:", categoriesResponse.data);
        setParentCategories(categoriesResponse.data);
      } catch (error) {
        console.error("Error fetching parent categories:", error);
        alert("Không thể lấy dữ liệu danh mục chính. Vui lòng thử lại sau.");
      } finally {
        setLoadingData(prev => ({ ...prev, categories: false }));
      }
      
      try {
        // Fetch suppliers
        const suppliersResponse = await axios.get("http://localhost:5000/api/suppliers");
        console.log("Suppliers data:", suppliersResponse.data);
        setSuppliers(suppliersResponse.data);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        alert("Không thể lấy dữ liệu nhà cung cấp. Vui lòng thử lại sau.");
      } finally {
        setLoadingData(prev => ({ ...prev, suppliers: false }));
      }
    };
    
    fetchInitialData();
  }, []);

  // Fetch subcategories when parent category changes
  useEffect(() => {
    const fetchSubCategories = async () => {
      if (formData.parentCategory) {
        setLoadingData(prev => ({ ...prev, subCategories: true }));
        try {
          const response = await axios.get(`http://localhost:5000/api/categories/subcategories/${formData.parentCategory}`);
          console.log("Subcategories data:", response.data);
          setSubCategories(response.data);
        } catch (error) {
          console.error("Error fetching subcategories:", error);
          setSubCategories([]);
          alert("Không thể lấy dữ liệu danh mục phụ. Vui lòng thử lại sau.");
        } finally {
          setLoadingData(prev => ({ ...prev, subCategories: false }));
        }
      } else {
        setSubCategories([]);
      }
    };
    
    fetchSubCategories();
  }, [formData.parentCategory]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
    
    // Clear subCategory when parentCategory changes
    if (name === 'parentCategory') {
      setFormData(prev => ({ ...prev, subCategory: "" }));
    }
  };

  // Handle rich text editor changes
  const handleEditorChange = (editorState) => {
    setEditorState(editorState);
    const contentState = editorState.getCurrentContent();
    const rawContent = JSON.stringify(convertToRaw(contentState));
    setFormData({ ...formData, details: rawContent });
  };

  // Handle main image upload
  const handleMainImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setFormData({ ...formData, mainImage: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setMainImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Clear error
      if (errors.mainImage) {
        setErrors({ ...errors, mainImage: null });
      }
    }
  };

  // Handle additional images upload
  const handleAdditionalImagesUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    
    if (imageFiles.length > 0) {
      // Limit to max 5 images total
      const currentImages = [...formData.additionalImages];
      const newImages = imageFiles.slice(0, 5 - currentImages.length);
      
      if (newImages.length > 0) {
        const updatedImages = [...currentImages, ...newImages];
        setFormData({ ...formData, additionalImages: updatedImages });
        
        // Create previews for new images
        const newPreviews = [];
        newImages.forEach(file => {
          const reader = new FileReader();
          reader.onload = () => {
            newPreviews.push(reader.result);
            if (newPreviews.length === newImages.length) {
              setAdditionalImagePreviews([...additionalImagePreviews, ...newPreviews]);
            }
          };
          reader.readAsDataURL(file);
        });
      }
    }
  };

  // Remove additional image
  const removeAdditionalImage = (index) => {
    const updatedImages = [...formData.additionalImages];
    const updatedPreviews = [...additionalImagePreviews];
    
    updatedImages.splice(index, 1);
    updatedPreviews.splice(index, 1);
    
    setFormData({ ...formData, additionalImages: updatedImages });
    setAdditionalImagePreviews(updatedPreviews);
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = "Tên sản phẩm là bắt buộc";
    if (!formData.price || formData.price <= 0) newErrors.price = "Giá sản phẩm không hợp lệ";
    if (!formData.parentCategory) newErrors.parentCategory = "Danh mục chính là bắt buộc";
    if (!formData.supplier) newErrors.supplier = "Nhà cung cấp là bắt buộc";
    if (!formData.mainImage) newErrors.mainImage = "Ảnh chính là bắt buộc";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

// Handle form submission
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  setLoading(true);

  try {
    const productData = new FormData();
    productData.append("name", formData.name);
    productData.append("price", parseFloat(formData.price));
    productData.append("parentCategory", formData.parentCategory);
    if (formData.subCategory) productData.append("subCategory", formData.subCategory);
    productData.append("supplier", formData.supplier);
    productData.append("stock", parseInt(formData.stock));
    productData.append("details", formData.details);
    productData.append("isFeature", formData.isFeature.toString());
    productData.append("unit", formData.unit);
    productData.append("description", formData.description); // Add description

    // Thêm ảnh chính
    if (formData.mainImage) {
      productData.append("mainImage", formData.mainImage);
    }

    // Thêm ảnh phụ
    formData.additionalImages.forEach(img => {
      productData.append("additionalImages", img);
    });

    console.log("📤 Sending product data:", formData);

    // Gửi request lên backend
    const response = await axios.post("http://localhost:5000/api/products", productData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    console.log("✅ Sản phẩm đã được tạo:", response.data);
    navigate("/manage-products");

  } catch (error) {
    console.error("❌ Lỗi khi thêm sản phẩm:", error.response?.data || error);
    alert("Lỗi khi thêm sản phẩm. Vui lòng thử lại.");
  } finally {
    setLoading(false);
  }
};




  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Thêm Sản Phẩm Mới
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Hình ảnh chính */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Ảnh Chính
              </Typography>
              <Box
                sx={{
                  border: errors.mainImage ? '1px dashed #d32f2f' : '1px dashed #ccc',
                  borderRadius: 1,
                  p: 2,
                  textAlign: 'center',
                  height: 300,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: 2,
                  backgroundColor: '#f5f5f5',
                }}
              >
                {mainImagePreview ? (
                  <>
                    <Box
                      component="img"
                      src={mainImagePreview}
                      alt="Preview"
                      sx={{
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        mb: 2,
                      }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<PhotoCamera />}
                      component="label"
                    >
                      Đổi ảnh
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleMainImageUpload}
                      />
                    </Button>
                  </>
                ) : (
                  <>
                    <PhotoCamera sx={{ fontSize: 60, color: '#bdbdbd', mb: 2 }} />
                    <Button
                      variant="contained"
                      component="label"
                      startIcon={<PhotoCamera />}
                    >
                      Tải ảnh chính
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleMainImageUpload}
                      />
                    </Button>
                  </>
                )}
              </Box>
              {errors.mainImage && (
                <FormHelperText error>{errors.mainImage}</FormHelperText>
              )}
            </Grid>
            
            {/* Hình ảnh phụ */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Ảnh Phụ (tối đa 5 ảnh)
              </Typography>
              <Box
                sx={{
                  border: '1px dashed #ccc',
                  borderRadius: 1,
                  p: 2,
                  height: 300,
                  backgroundColor: '#f5f5f5',
                  overflowY: 'auto',
                }}
              >
                <Grid container spacing={1}>
                  {additionalImagePreviews.map((preview, index) => (
                    <Grid item xs={4} key={index}>
                      <Card sx={{ position: 'relative', height: 120 }}>
                        <CardMedia
                          component="img"
                          image={preview}
                          alt={`Preview ${index + 1}`}
                          sx={{ height: '100%', objectFit: 'contain' }}
                        />
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            backgroundColor: 'rgba(255,255,255,0.7)',
                          }}
                          onClick={() => removeAdditionalImage(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Card>
                    </Grid>
                  ))}
                  
                  {formData.additionalImages.length < 5 && (
                    <Grid item xs={4}>
                      <Box
                        sx={{
                          border: '1px dashed #bdbdbd',
                          borderRadius: 1,
                          height: 120,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Button
                          component="label"
                          startIcon={<PhotoCamera />}
                        >
                          Thêm ảnh
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            multiple
                            onChange={handleAdditionalImagesUpload}
                          />
                        </Button>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Box>
              <FormHelperText>
                Bạn đã chọn {formData.additionalImages.length}/5 ảnh phụ
              </FormHelperText>
            </Grid>
            
            {/* Thông tin cơ bản */}
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Tên sản phẩm"
                fullWidth
                variant="outlined"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                required
                margin="normal"
              />
              
              <TextField
                name="price"
                label="Giá sản phẩm"
                fullWidth
                type="number"
                variant="outlined"
                value={formData.price}
                onChange={handleChange}
                InputProps={{ inputProps: { min: 0 } }}
                error={!!errors.price}
                helperText={errors.price}
                required
                margin="normal"
              />
              
              <TextField
                name="stock"
                label="Số lượng"
                fullWidth
                type="number"
                variant="outlined"
                value={formData.stock}
                onChange={handleChange}
                InputProps={{ inputProps: { min: 0 } }}
                margin="normal"
              />

              <TextField
                name="unit"
                label="Đơn vị tính"
                fullWidth
                variant="outlined"
                value={formData.unit}
                onChange={handleChange}
                error={!!errors.unit}
                helperText={errors.unit}
                margin="normal"
              />

              <TextField
                name="description"
                label="Mô tả sản phẩm"
                fullWidth
                variant="outlined"
                value={formData.description}
                onChange={handleChange}
                error={!!errors.description}
                helperText={errors.description}
                margin="normal"
              />
            </Grid>
            
            {/* Danh mục và nhà cung cấp */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" error={!!errors.parentCategory} required>
                <InputLabel>Danh mục chính</InputLabel>
                <Select
                  name="parentCategory"
                  value={formData.parentCategory}
                  onChange={handleChange}
                  label="Danh mục chính"
                  disabled={loadingData.categories}
                >
                  {loadingData.categories ? (
                    <MenuItem disabled>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Đang tải...
                      </Box>
                    </MenuItem>
                  ) : parentCategories.length > 0 ? (
                    parentCategories.map((category) => (
                      <MenuItem key={category._id} value={category._id}>
                        {category.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Không có danh mục nào</MenuItem>
                  )}
                </Select>
                {errors.parentCategory && (
                  <FormHelperText>{errors.parentCategory}</FormHelperText>
                )}
              </FormControl>
              
              <FormControl 
                fullWidth 
                margin="normal" 
                disabled={!formData.parentCategory || loadingData.subCategories}
              >
                <InputLabel>Danh mục phụ</InputLabel>
                <Select
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  label="Danh mục phụ"
                >
                  {loadingData.subCategories ? (
                    <MenuItem disabled>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Đang tải...
                      </Box>
                    </MenuItem>
                  ) : subCategories.length > 0 ? (
                    subCategories.map((category) => (
                      <MenuItem key={category._id} value={category._id}>
                        {category.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Không có danh mục phụ nào</MenuItem>
                  )}
                </Select>
                <FormHelperText>
                  {!formData.parentCategory ? "Vui lòng chọn danh mục chính trước" : ""}
                </FormHelperText>
              </FormControl>
              
              <FormControl fullWidth margin="normal" error={!!errors.supplier} required>
                <InputLabel>Nhà cung cấp</InputLabel>
                <Select
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  label="Nhà cung cấp"
                  disabled={loadingData.suppliers}
                >
                  {loadingData.suppliers ? (
                    <MenuItem disabled>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Đang tải...
                      </Box>
                    </MenuItem>
                  ) : suppliers.length > 0 ? (
                    suppliers.map((supplier) => (
                      <MenuItem key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Không có nhà cung cấp nào</MenuItem>
                  )}
                </Select>
                {errors.supplier && (
                  <FormHelperText>{errors.supplier}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            {/* Chi tiết sản phẩm */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Chi tiết sản phẩm
              </Typography>
              <TextField
                name="details"
                label="Chi tiết sản phẩm"
                fullWidth
                variant="outlined"
                value={formData.details}
                onChange={handleChange}
                error={!!errors.details}
                helperText={errors.details}
                required
                margin="normal"
                multiline
                rows={7} // Increase the height by setting the number of rows
              />
            </Grid>
            
            {/* Form actions */}
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate("/manage-products")}
                disabled={loading}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                startIcon={loading && <CircularProgress size={20} color="inherit" />}
              >
                {loading ? "Đang xử lý..." : "Thêm sản phẩm"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default AddProduct;