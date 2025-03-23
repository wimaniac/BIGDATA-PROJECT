import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthForm from "../../components/AuthForm";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const Register = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleRegister = async (e, formData) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/api/users", formData);
      localStorage.setItem("user", JSON.stringify(response.data.user)); // Lưu thông tin user vào localStorage
      navigate("/"); // Chuyển hướng sau khi đăng ký thành công
    } catch (error) {
      setError(error.response?.data?.message || "Đăng ký thất bại!");
    }
  };

  const handleGoogleRegister = async (response) => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/google-register", {
        tokenId: response.credential,
      });
      localStorage.setItem("user", JSON.stringify(res.data.user)); // Lưu thông tin user vào localStorage
      alert("Đăng ký thành công!"); // Thông báo đăng ký thành công
      navigate("/"); // Chuyển hướng sau khi đăng ký thành công
    } catch (error) {
      setError(error.response?.data?.message || "Đăng ký bằng Google thất bại!");
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <AuthForm isLogin={false} onSubmit={handleRegister} errorMessage={error} />
      <GoogleLogin
        onSuccess={handleGoogleRegister}
        onError={() => setError("Đăng ký bằng Google thất bại!")}
      />
    </GoogleOAuthProvider>
  );
};

export default Register;
