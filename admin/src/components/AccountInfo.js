import React from "react";
import { Typography, Container } from "@mui/material";

const AccountInfo = () => {
  const user = JSON.parse(localStorage.getItem("user")) || {};
  return (
    <Container>
      <Typography variant="h4">Thông tin tài khoản</Typography>
      <Typography>Tên: {user.name || "Không có"}</Typography>
      <Typography>Email: {user.email || "Không có"}</Typography>
      <Typography>Vai trò: {user.role || "Không xác định"}</Typography>
    </Container>
  );
};

export default AccountInfo;