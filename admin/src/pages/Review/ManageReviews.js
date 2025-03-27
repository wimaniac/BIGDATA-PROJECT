import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Button,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";

// Styled component
const ReviewsContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(6),
}));

const ManageReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchReviews = async () => {
      if (!token) {
        alert("Vui lòng đăng nhập để xem đánh giá!");
        window.location.href = "http://localhost:3000/login";
        return;
      }

      try {
        const response = await axios.get("http://localhost:5000/api/reviews", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReviews(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách đánh giá:", error);
        setLoading(false);
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "http://localhost:3000/login";
        }
      }
    };
    fetchReviews();
  }, [token]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Bạn có chắc muốn xóa đánh giá này không?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReviews((prevReviews) => prevReviews.filter((review) => review._id !== reviewId));
      alert("Xóa đánh giá thành công!");
    } catch (error) {
      console.error("Lỗi khi xóa đánh giá:", error);
      alert("Có lỗi xảy ra khi xóa đánh giá!");
    }
  };

  if (loading) {
    return (
      <ReviewsContainer>
        <Typography variant="h6">Đang tải...</Typography>
      </ReviewsContainer>
    );
  }

  return (
    <ReviewsContainer>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
        Quản lý đánh giá
      </Typography>
      {reviews.length === 0 ? (
        <Typography>Chưa có đánh giá nào.</Typography>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Người dùng</TableCell>
                  <TableCell>Sản phẩm</TableCell>
                  <TableCell>Số sao</TableCell>
                  <TableCell>Nhận xét</TableCell>
                  <TableCell>Ngày tạo</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviews
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((review) => (
                    <TableRow key={review._id}>
                      <TableCell>{review.userId?.name || "Không xác định"}</TableCell>
                      <TableCell>{review.productId?.name || "Không xác định"}</TableCell>
                      <TableCell>{review.rating}</TableCell>
                      <TableCell>{review.comment}</TableCell>
                      <TableCell>{new Date(review.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() => handleDeleteReview(review._id)}
                        >
                          Xóa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={reviews.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        </>
      )}
    </ReviewsContainer>
  );
};

export default ManageReviews;