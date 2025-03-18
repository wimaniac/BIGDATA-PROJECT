import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthForm from "../../components/AuthForm";

const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleLogin = async (e, formData) => {
    e.preventDefault();
    setError(""); // Xóa lỗi cũ

    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", formData);
      localStorage.setItem("token", response.data.token); // Lưu token vào localStorage
      navigate("/");
    } catch (error) {
      setError(error.response?.data?.message || "Đăng nhập thất bại!");
    }
  };

  return (
    <AuthForm isLogin={true} onSubmit={handleLogin} errorMessage={error} />
  );
};

export default Login;
