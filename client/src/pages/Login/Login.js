import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Thêm Link vào import
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

// Styled components cho trang login
const LoginContainer = styled(Container)(({ theme }) => ({
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #6e8efb, #a777e3)",
}));

const LoginPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  width: "100%",
  maxWidth: 400,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  backgroundColor: "white",
}));

const LoginButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(1.5),
  fontWeight: "bold",
  textTransform: "none",
  backgroundColor: "#6e8efb",
  "&:hover": {
    backgroundColor: "#5a78e0",
  },
}));

const GoogleLoginWrapper = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  display: "flex",
  justifyContent: "center",
}));

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/api/users/auth/login", formData);
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      if (["admin", "sales", "manager"].includes(user.role)) {
        window.location.href = `http://localhost:3001/manage-products?token=${token}`; // Redirect to admin page
      } else {
        navigate("/");
      }
    } catch (error) {
      setError(error.response?.data?.message || "Đăng nhập thất bại!");
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const res = await axios.post("http://localhost:5000/api/users/auth/google-login", {
        tokenId: credentialResponse.credential,
      });

      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userId", user._id);

      if (["admin", "sales", "manager"].includes(user.role)) {
        window.location.href = `http://localhost:3001/manage-products?token=${token}`; // Redirect to admin page
      } else {
        window.location.href = "/";
      }
    } catch (error) {
      setError(error.response?.data?.message || "Đăng nhập bằng Google thất bại!");
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <LoginContainer>
        <LoginPaper elevation={3}>
          <Typography variant="h5" align="center" gutterBottom fontWeight="bold">
            Đăng nhập
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            <TextField
              label="Email"
              name="email"
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
            <LoginButton type="submit" variant="contained" color="primary" fullWidth>
              Đăng nhập
            </LoginButton>
          </form>

          <Divider sx={{ my: 2 }}>Hoặc</Divider>

          <GoogleLoginWrapper>
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => console.log("Đăng nhập bằng Google thất bại!")}
            />
          </GoogleLoginWrapper>

          <Box mt={2} textAlign="center">
            <Typography variant="body2">
              Chưa có tài khoản?{" "}
              <Button component={Link} to="/register" color="primary">
                Đăng ký
              </Button>
            </Typography>
          </Box>
        </LoginPaper>
      </LoginContainer>
    </GoogleOAuthProvider>
  );
};

export default Login;