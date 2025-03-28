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
  Collapse,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import { LineChart } from "@mui/x-charts/LineChart";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

// Styled Container
const RevenueContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(6),
}));

const ManageRevenue = () => {
  const [viewMode, setViewMode] = useState("category"); // "category" hoặc "time"
  const [revenues, setRevenues] = useState([]); // Doanh thu theo danh mục
  const [timeRevenues, setTimeRevenues] = useState([]); // Doanh thu theo thời gian
  const [period, setPeriod] = useState("month"); // "day", "month", "year"
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [error, setError] = useState(null);
  const [openRows, setOpenRows] = useState({}); // Trạng thái mở/đóng cho từng danh mục
  const token = localStorage.getItem("token");

  // Lấy dữ liệu doanh thu theo danh mục
  const fetchCategoryRevenues = async () => {
    try {
      if (!token) throw new Error("Vui lòng đăng nhập!");
      const response = await axios.get(
        "http://localhost:5000/api/revenue-reports/category",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRevenues(response.data || []);
      setError(null);
    } catch (error) {
      console.error("Lỗi khi lấy doanh thu theo danh mục:", error);
      setError(error.response?.data?.message || error.message);
    }
  };

  // Lấy dữ liệu doanh thu theo thời gian
  const fetchTimeRevenues = async () => {
    try {
      if (!token) throw new Error("Vui lòng đăng nhập!");
      const response = await axios.get(
        `http://localhost:5000/api/revenue-reports/time?period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTimeRevenues(response.data || []);
      setError(null);
    } catch (error) {
      console.error("Lỗi khi lấy doanh thu theo thời gian:", error);
      setError(error.response?.data?.message || error.message);
    }
  };

  // Gọi API khi thay đổi viewMode hoặc period
  useEffect(() => {
    if (viewMode === "category") {
      fetchCategoryRevenues();
    } else {
      fetchTimeRevenues();
    }
  }, [viewMode, period]);

  // Xử lý phân trang
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Mở/đóng chi tiết sản phẩm trong danh mục
  const toggleRow = (categoryId) => {
    setOpenRows((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Thay đổi chu kỳ thời gian
  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
  };

  // Chuẩn bị dữ liệu cho biểu đồ
  const timeLabels = timeRevenues.map((item) => item.time);
  const revenueData = timeRevenues.map((item) => item.revenue);

  return (
    <RevenueContainer>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
        Quản lý Doanh Thu
      </Typography>

      {/* Nút chuyển đổi chế độ xem và bộ lọc chu kỳ */}
      <Box sx={{ display: "flex", gap: 2, marginBottom: 3 }}>
        <Button
          variant={viewMode === "category" ? "contained" : "outlined"}
          color="primary"
          onClick={() => setViewMode("category")}
        >
          Theo Danh Mục
        </Button>
        <Button
          variant={viewMode === "time" ? "contained" : "outlined"}
          color="primary"
          onClick={() => setViewMode("time")}
        >
          Theo Thời Gian
        </Button>
        {viewMode === "time" && (
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Chu kỳ</InputLabel>
            <Select value={period} onChange={handlePeriodChange}>
              <MenuItem value="day">Ngày</MenuItem>
              <MenuItem value="month">Tháng</MenuItem>
              <MenuItem value="year">Năm</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Hiển thị lỗi nếu có */}
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {/* Hiển thị dữ liệu */}
      {viewMode === "category" ? (
        revenues.length === 0 ? (
          <Typography>Không có dữ liệu doanh thu theo danh mục!</Typography>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell /> {/* Cột cho nút mở rộng */}
                    <TableCell>STT</TableCell>
                    <TableCell>Tên Danh Mục</TableCell>
                    <TableCell align="right">Tổng Số Lượng Bán</TableCell>
                    <TableCell align="right">Tổng Doanh Thu (VNĐ)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {revenues
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((revenue, index) => (
                      <React.Fragment key={revenue.categoryId}>
                        <TableRow>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => toggleRow(revenue.categoryId)}
                            >
                              {openRows[revenue.categoryId] ? (
                                <KeyboardArrowUpIcon />
                              ) : (
                                <KeyboardArrowDownIcon />
                              )}
                            </IconButton>
                          </TableCell>
                          <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                          <TableCell>{revenue.categoryName}</TableCell>
                          <TableCell align="right">{revenue.totalSoldItems}</TableCell>
                          <TableCell align="right">
                            {revenue.totalRevenue.toLocaleString("vi-VN")}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                            <Collapse
                              in={openRows[revenue.categoryId]}
                              timeout="auto"
                              unmountOnExit
                            >
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Tên Sản Phẩm</TableCell>
                                    <TableCell align="right">Số Lượng Bán</TableCell>
                                    <TableCell align="right">Doanh Thu (VNĐ)</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {revenue.products.map((product, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{product.productName}</TableCell>
                                      <TableCell align="right">{product.quantity}</TableCell>
                                      <TableCell align="right">
                                        {product.revenue.toLocaleString("vi-VN")}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={revenues.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )
      ) : (
        timeRevenues.length === 0 ? (
          <Typography>Không có dữ liệu doanh thu theo thời gian!</Typography>
        ) : (
          <LineChart
            xAxis={[
              {
                data: timeLabels,
                label: period === "day" ? "Ngày" : period === "month" ? "Tháng" : "Năm",
                scaleType: "band", // Sử dụng band để hiển thị thời gian rời rạc
              },
            ]}
            series={[
              {
                data: revenueData,
                label: "Doanh Thu (VNĐ)",
                color: "#1976d2",
                valueFormatter: (value) => value.toLocaleString("vi-VN"),
              },
            ]}
            height={400}
            margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
            grid={{ vertical: true, horizontal: true }}
            sx={{
              "& .MuiLineElement-root": { strokeWidth: 2 },
              "& .MuiChartsLegend-root": { fontSize: "14px" },
            }}
          />
        )
      )}
    </RevenueContainer>
  );
};

export default ManageRevenue;