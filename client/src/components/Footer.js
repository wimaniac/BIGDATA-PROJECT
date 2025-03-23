import React from "react";
import { Box, Container, Grid, Typography, Link, TextField, Button, IconButton } from "@mui/material";
import { Facebook, Twitter, Instagram, YouTube } from "@mui/icons-material";

const Footer = () => {
  return (
    <Box sx={{ backgroundColor: "#222", color: "#fff", py: 6, mt: 4 }}>
      <Container>
        <Grid container spacing={4}>
          {/* Cột 1: Giới thiệu */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Về Chúng Tôi
            </Typography>
            <Typography variant="body2" sx={{ color: "#bbb" }}>
              Chúng tôi là nền tảng thương mại điện tử cung cấp sản phẩm chất lượng với dịch vụ tận tâm.
            </Typography>
          </Grid>

          {/* Cột 2: Dịch vụ khách hàng */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Dịch Vụ Khách Hàng
            </Typography>
            <Link href="#" color="inherit" variant="body2" display="block" sx={{ mb: 1, color: "#bbb", "&:hover": { color: "#fff" } }}>
              Liên Hệ
            </Link>
            <Link href="#" color="inherit" variant="body2" display="block" sx={{ mb: 1, color: "#bbb", "&:hover": { color: "#fff" } }}>
              Câu Hỏi Thường Gặp
            </Link>
            <Link href="#" color="inherit" variant="body2" display="block" sx={{ mb: 1, color: "#bbb", "&:hover": { color: "#fff" } }}>
              Chính Sách Trả Hàng
            </Link>
          </Grid>

          {/* Cột 3: Mạng xã hội */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Theo Dõi Chúng Tôi
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <IconButton href="#" sx={{ color: "#bbb", "&:hover": { color: "#1877f2" } }}>
                <Facebook />
              </IconButton>
              <IconButton href="#" sx={{ color: "#bbb", "&:hover": { color: "#1da1f2" } }}>
                <Twitter />
              </IconButton>
              <IconButton href="#" sx={{ color: "#bbb", "&:hover": { color: "#e1306c" } }}>
                <Instagram />
              </IconButton>
              <IconButton href="#" sx={{ color: "#bbb", "&:hover": { color: "#ff0000" } }}>
                <YouTube />
              </IconButton>
            </Box>
          </Grid>

          {/* Cột 4: Bản tin đăng ký email */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Đăng Ký Nhận Tin
            </Typography>
            <Typography variant="body2" sx={{ color: "#bbb", mb: 2 }}>
              Nhận thông tin về ưu đãi & sản phẩm mới nhất.
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField 
                variant="outlined" 
                placeholder="Nhập email của bạn" 
                size="small" 
                sx={{
                  bgcolor: "#fff",
                  borderRadius: "5px",
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { border: "none" },
                  },
                }}
              />
              <Button variant="contained" color="primary">
                Gửi
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Dòng bản quyền */}
        <Box sx={{ textAlign: "center", mt: 4, pt: 3, borderTop: "1px solid #444" }}>
          <Typography variant="body2" sx={{ color: "#bbb" }}>
            &copy; {new Date().getFullYear()} Công Ty Của Bạn. Bảo lưu mọi quyền.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
