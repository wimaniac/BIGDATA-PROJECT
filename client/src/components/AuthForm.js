import React, { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Grid,
  Link,
  Alert,
} from "@mui/material";
import { FcGoogle } from "react-icons/fc";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";

const AuthForm = ({ isLogin, onSubmit, errorMessage }) => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <Grid container justifyContent="center" alignItems="center" sx={{ height: "100vh" }}>
        <Paper elevation={3} sx={{ padding: 6, maxWidth: 500 }}>
          <Typography variant="h5" align="center" gutterBottom>
            {isLogin ? "Đăng nhập" : "Đăng ký"}
          </Typography>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <Box component="form" onSubmit={(e) => onSubmit(e, formData)} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {!isLogin && (
              <TextField label="Họ và tên" name="name" value={formData.name} onChange={handleChange} fullWidth required />
            )}
            <TextField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} fullWidth required />
            <TextField label="Mật khẩu" name="password" type="password" value={formData.password} onChange={handleChange} fullWidth required />
            <Button type="submit" variant="contained" color="primary" fullWidth>
              {isLogin ? "Đăng nhập" : "Đăng ký"}
            </Button>
            <GoogleLogin
              onSuccess={onSubmit}
              onError={() => console.log("Google login/register failed")}
              render={(renderProps) => (
                <Button
                  onClick={renderProps.onClick}
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  startIcon={<FcGoogle />}
                  sx={{ color: "black", borderColor: "#d3d3d3" }}
                >
                  {isLogin ? "Đăng nhập với Google" : "Đăng ký với Google"}
                </Button>
              )}
            />
          </Box>
          <Box textAlign="center" mt={2}>
            {isLogin ? (
              <Typography variant="body2">
                Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
              </Typography>
            ) : (
              <Typography variant="body2">
                Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
              </Typography>
            )}
          </Box>
        </Paper>
      </Grid>
    </GoogleOAuthProvider>
  );
};

export default AuthForm;
