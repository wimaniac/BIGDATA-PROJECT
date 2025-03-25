import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Thêm Link để liên kết đến trang login
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Divider,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Styled components cho trang đăng ký
const RegisterContainer = styled(Container)(({ theme }) => ({
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #6e8efb, #a777e3)",
}));

const RegisterPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  width: "100%",
  maxWidth: 400,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  backgroundColor: "white",
}));

const RegisterButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(1.5),
  fontWeight: "bold",
  textTransform: "none",
  backgroundColor: "#6e8efb",
  "&:hover": {
    backgroundColor: "#5a78e0",
  },
}));

const GoogleRegisterWrapper = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  display: "flex",
  justifyContent: "center",
}));

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/api/users", formData);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      toast.success("Đăng ký thành công!");
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || "Đăng ký thất bại!");
    }
  };

  const handleGoogleRegister = async (response) => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/google-register", {
        tokenId: response.credential,
      });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.success("Đăng ký thành công!");
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || "Đăng ký bằng Google thất bại!");
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <RegisterContainer>
        <RegisterPaper elevation={3}>
          <Typography variant="h5" align="center" gutterBottom fontWeight="bold">
            Đăng ký
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleRegister}>
            <TextField
              label="Họ và tên"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
              variant="outlined"
              required
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
              variant="outlined"
              required
            />
            <TextField
              label="Mật khẩu"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
              variant="outlined"
              required
            />
            <RegisterButton type="submit" variant="contained" color="primary" fullWidth>
              Đăng ký
            </RegisterButton>
          </form>

          <Divider sx={{ my: 2 }}>Hoặc</Divider>

          <GoogleRegisterWrapper>
            <GoogleLogin
              onSuccess={handleGoogleRegister}
              onError={() => setError("Đăng ký bằng Google thất bại!")}
            />
          </GoogleRegisterWrapper>

          <Box mt={2} textAlign="center">
            <Typography variant="body2">
              Đã có tài khoản?{" "}
              <Button component={Link} to="/login" color="primary">
                Đăng nhập
              </Button>
            </Typography>
          </Box>
        </RegisterPaper>
      </RegisterContainer>
    </GoogleOAuthProvider>
  );
};

export default Register;