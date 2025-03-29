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
  Tabs,
  Tab,
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
  const [tabValue, setTabValue] = useState(0); // 0: Theo danh mục, 1: Theo thời gian
  const [revenues, setRevenues] = useState([]); // Doanh thu theo danh mục
  const [timeRevenues, setTimeRevenues] = useState({ day: [], month: [], year: [] }); // Doanh thu theo thời gian
  const [period, setPeriod] = useState("month"); // Chu kỳ thời gian: "day", "month", "year"
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [error, setError] = useState(null);
  const [openRows, setOpenRows] = useState({}); // Trạng thái mở/đóng cho từng danh mục
  const token = localStorage.getItem("token");

  // Lấy dữ liệu doanh thu theo danh mục
  const fetchCategoryRevenues = async () => {
    try {
      if (!token) {
        setError("Vui lòng đăng nhập để xem báo cáo doanh thu!");
        return;
      }
      const response = await axios.get("http://localhost:5000/api/revenue-reports/category", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Doanh thu theo danh mục:", response.data); // Debug dữ liệu
      const data = Array.isArray(response.data) ? response.data : [];
      setRevenues(data);
      setError(null);
    } catch (error) {
      console.error("Lỗi khi lấy doanh thu theo danh mục:", error);
      setError(
        error.response?.data?.message || "Không thể tải dữ liệu doanh thu theo danh mục!"
      );
      setRevenues([]);
    }
  };
  // Lấy dữ liệu doanh thu theo thời gian cho tất cả chu kỳ
  const fetchTimeRevenues = async () => {
    try {
      if (!token) {
        setError("Vui lòng đăng nhập để xem báo cáo doanh thu!");
        return;
      }
      const periods = ["day", "month", "year"];
      const results = await Promise.all(
        periods.map(async (p) => {
          const response = await axios.get(
            `http://localhost:5000/api/revenue-reports/time?period=${p}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log(`Doanh thu theo ${p}:`, response.data); // Debug dữ liệu
          return { period: p, data: Array.isArray(response.data) ? response.data : [] };
        })
      );
      const updatedTimeRevenues = results.reduce((acc, { period, data }) => {
        acc[period] = data;
        return acc;
      }, {});
      setTimeRevenues(updatedTimeRevenues);
      setError(null);
    } catch (error) {
      console.error("Lỗi khi lấy doanh thu theo thời gian:", error);
      setError(
        error.response?.data?.message || "Không thể tải dữ liệu doanh thu theo thời gian!"
      );
      setTimeRevenues({ day: [], month: [], year: [] });
    }
  };

  // Gọi API khi thay đổi tab
  useEffect(() => {
    if (tabValue === 0) {
      fetchCategoryRevenues();
    } else {
      fetchTimeRevenues();
    }
  }, [tabValue]);

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

  // Thay đổi tab
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0); // Reset trang khi chuyển tab
  };

  // Thay đổi chu kỳ thời gian
  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
  };

  // Chuẩn bị dữ liệu cho biểu đồ
  const currentTimeData = timeRevenues[period];
  const timeLabels = currentTimeData.map((item) => item.time);
  const revenueData = currentTimeData.map((item) => item.revenue);

  return (
    <RevenueContainer>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
        Quản lý Doanh Thu
      </Typography>

      {/* Tabs để chuyển đổi giữa các chế độ xem */}
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Theo Danh Mục" />
        <Tab label="Theo Thời Gian" />
      </Tabs>

      {/* Hiển thị lỗi nếu có */}
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {/* Hiển thị dữ liệu */}
      {tabValue === 0 ? (
        !Array.isArray(revenues) || revenues.length === 0 ? (
          <Typography>Không có dữ liệu doanh thu theo danh mục!</Typography>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 50 }} /> {/* Cột cho nút mở rộng */}
                    <TableCell sx={{ width: 50 }}>STT</TableCell>
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
        <Box>
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Chu kỳ</InputLabel>
              <Select value={period} onChange={handlePeriodChange}>
                <MenuItem value="day">Ngày</MenuItem>
                <MenuItem value="month">Tháng</MenuItem>
                <MenuItem value="year">Năm</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {timeRevenues[period].length === 0 ? (
            <Typography>Không có dữ liệu doanh thu theo {period}!</Typography>
          ) : (
            <LineChart
              xAxis={[
                {
                  data: timeLabels,
                  label: period === "day" ? "Ngày" : period === "month" ? "Tháng" : "Năm",
                  scaleType: "band",
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
          )}
        </Box>
      )}
    </RevenueContainer>
  );
};

export default ManageRevenue;