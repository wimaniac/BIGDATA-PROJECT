import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthForm from "../../components/AuthForm";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  console.log("Google Client ID:", process.env.REACT_APP_GOOGLE_CLIENT_ID);

  const handleLogin = async (e, formData) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setError(""); // Xóa lỗi cũ

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        formData
      );
      localStorage.setItem("token", response.data.token); // Lưu token vào localStorage
      localStorage.setItem("user", JSON.stringify(response.data.user)); // Lưu thông tin user vào localStorage
      navigate("/");
    } catch (error) {
      setError(error.response?.data?.message || "Đăng nhập thất bại!");
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/google-login", {
        tokenId: credentialResponse.credential, // Đảm bảo lấy đúng token
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      alert("Đăng nhập thành công!");
      navigate("/");
    } catch (error) {
      setError(error.response?.data?.message || "Đăng nhập bằng Google thất bại!");
    }
  };
  
  return (
<GoogleOAuthProvider clientId="906482983088-q8c49v8p9v625c5nhocg3snogunrps4l.apps.googleusercontent.com">
<AuthForm isLogin={true} onSubmit={handleLogin} errorMessage={error} />
      <GoogleLogin
        onSuccess={handleGoogleLogin}
        onError={() => console.log("Đăng nhập Google thất bại!")}
      />
    </GoogleOAuthProvider>
  );
};

export default Login;
