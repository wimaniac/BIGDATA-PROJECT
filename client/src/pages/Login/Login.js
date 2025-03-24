import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthForm from "../../components/AuthForm";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleLogin = async (e, formData) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/api/users/auth/login", formData);
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      if (["sales", "manager", "admin"].includes(user.role)) {
        // Truyền token qua URL khi chuyển hướng sang admin
        window.location.href = `http://localhost:3001/manage-products?token=${token}`;
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

      if (["sales", "manager", "admin"].includes(user.role)) {
        // Truyền token qua URL khi chuyển hướng sang admin
        window.location.href = `http://localhost:3001/manage-products?token=${token}`;
      } else {
        navigate("/");
      }
    } catch (error) {
      setError(error.response?.data?.message || "Đăng nhập bằng Google thất bại!");
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <AuthForm isLogin={true} onSubmit={handleLogin} errorMessage={error} />
      <GoogleLogin
        onSuccess={handleGoogleLogin}
        onError={() => console.log("Đăng nhập bằng Google thất bại!")}
      />
    </GoogleOAuthProvider>
  );
};

export default Login;