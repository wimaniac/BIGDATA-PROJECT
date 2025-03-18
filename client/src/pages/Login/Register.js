import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthForm from "../../components/AuthForm";

const Register = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleRegister = async (e, formData) => {
    e.preventDefault();
    setError("");

    try {
      await axios.post("http://localhost:5000/api/users", formData);
      navigate("/login"); // Chuyển hướng sau khi đăng ký thành công
    } catch (error) {
      setError(error.response?.data?.message || "Đăng ký thất bại!");
    }
  };

  return (
    <AuthForm isLogin={false} onSubmit={handleRegister} errorMessage={error} />
  );
};

export default Register;
