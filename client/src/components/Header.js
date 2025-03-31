import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Button,
  InputBase,
  Container,
  Divider,
  Tooltip,
  Avatar,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";
import {
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Favorite as FavoriteIcon,
} from "@mui/icons-material";
import axios from "axios";
import { Link } from "react-router-dom";
import logo from "../assets/logo.jpg";

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "white",
  color: "black",
  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
  position: "sticky",
  top: 0,
  zIndex: theme.zIndex.drawer + 1,
}));

const SearchBox = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  border: "1px solid #e0e0e0",
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
  },
  marginLeft: theme.spacing(3),
  marginRight: theme.spacing(3),
  flexGrow: 1,
  maxWidth: 600,
  transition: "all 0.3s",
  [theme.breakpoints.down("md")]: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
  [theme.breakpoints.down("sm")]: {
    marginLeft: theme.spacing(0),
    marginRight: theme.spacing(0),
    marginTop: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    width: "100%",
    order: 3,
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.text.secondary,
  zIndex: 1,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  width: "100%",
  padding: theme.spacing(1, 1, 1, 0),
  paddingLeft: `calc(1em + ${theme.spacing(4)})`,
  transition: theme.transitions.create("width"),
  borderRadius: theme.shape.borderRadius,
  "& .MuiInputBase-input": {
    "&::placeholder": {
      color: theme.palette.text.secondary,
      opacity: 0.8,
    },
  },
}));

const CategoryButton = styled(Button)(({ theme }) => ({
  textTransform: "none",
  fontWeight: 600,
  color: theme.palette.text.primary,
  padding: theme.spacing(1.5, 2.5),
  borderRadius: theme.shape.borderRadius,
  display: "flex",
  alignItems: "center",
  transition: "all 0.2s",
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    color: theme.palette.primary.main,
  },
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(1, 1.5),
    minWidth: "auto",
  },
}));

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.primary,
  margin: theme.spacing(0, 1),
  padding: theme.spacing(1),
  transition: "all 0.2s",
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    color: theme.palette.primary.main,
  },
}));

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  padding: theme.spacing(1.5, 2.5),
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
}));

const Header = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [childAnchorEl, setChildAnchorEl] = useState(null);
  const [parentCategories, setParentCategories] = useState([]);
  const [childCategories, setChildCategories] = useState({});
  const [currentParentId, setCurrentParentId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [user, setUser] = useState(null);
  const [anchorUserEl, setAnchorUserEl] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const token = localStorage.getItem("token");

  const fetchUser = async () => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (token) {
      try {
        const response = await axios.get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
        localStorage.setItem("userId", response.data._id);
      } catch (error) {
        console.error("Token invalid or expired:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userId");
        setUser(null);
      }
    } else {
      setUser(userData || null);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/categories/parents");
      setParentCategories(response.data);
    } catch (error) {
      console.error("Error fetching parent categories:", error);
    }
  };

  const fetchCartCount = async () => {
    const userId = localStorage.getItem("userId");
    if (userId && token) {
      try {
        const response = await axios.get(`http://localhost:5000/api/cart/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const cartItems = response.data?.items || [];
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(totalItems);
      } catch (error) {
        console.error("Error fetching cart count:", error);
        setCartCount(0);
      }
    } else {
      setCartCount(0);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchCategories();
    fetchCartCount();

    const handleCartUpdated = (event) => {
      const newCartCount = event.detail?.cartCount || 0;
      setCartCount(newCartCount);
    };

    window.addEventListener("storage", fetchUser);
    window.addEventListener("userUpdated", fetchUser);
    window.addEventListener("cartUpdated", handleCartUpdated);

    return () => {
      window.removeEventListener("storage", fetchUser);
      window.removeEventListener("userUpdated", fetchUser);
      window.removeEventListener("cartUpdated", handleCartUpdated);
    };
  }, [token]);

  const fetchChildCategories = async (parentId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/categories/subcategories/${parentId}`
      );
      setChildCategories((prev) => ({ ...prev, [parentId]: response.data }));
    } catch (error) {
      console.error("Error fetching child categories:", error);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setChildAnchorEl(null);
    setCurrentParentId(null);
  };

  const handleParentClick = async (event, parentId) => {
    setCurrentParentId(parentId);
    setChildAnchorEl(event.currentTarget);
    if (!childCategories[parentId]) {
      await fetchChildCategories(parentId);
    }
  };

  const handleChildMenuClose = () => {
    setChildAnchorEl(null);
    setCurrentParentId(null);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      console.log("Tìm kiếm:", searchValue);
    }
  };

  const handleUserMenuOpen = (event) => {
    setAnchorUserEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorUserEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setUser(null);
    setCartCount(0);
    handleUserMenuClose();
    window.location.href = "/login";
  };

  return (
    <StyledAppBar>
      <Container maxWidth="xl">
        <Toolbar
          sx={{
            flexWrap: { xs: "wrap", sm: "nowrap" },
            py: { xs: 1.5, md: 1 },
            px: { xs: 2, md: 3 },
            gap: { sm: 2, md: 3 },
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: { xs: "space-between", sm: "flex-start" },
              width: { xs: "100%", sm: "auto" },
              mr: { sm: 2 },
            }}
          >
            <Link
              to="/"
              style={{
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
              }}
            >
              <img
                src={logo}
                alt="Logo"
                style={{ height: 45, width: "auto", cursor: "pointer" }}
              />
            </Link>
            <IconButton
              sx={{ display: { sm: "none" } }}
              onClick={handleMobileMenuToggle}
            >
              <MenuIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: { xs: mobileMenuOpen ? "flex" : "none", sm: "flex" },
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              width: { xs: "100%", sm: "auto" },
              order: { xs: 2, sm: 1 },
              mt: { xs: 1.5, sm: 0 },
              mb: { xs: 1, sm: 0 },
            }}
          >
            <CategoryButton
              onClick={handleMenuOpen}
              startIcon={<MenuIcon sx={{ mr: 0.5 }} />}
            >
              Danh mục
            </CategoryButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 3,
                sx: {
                  width: 250,
                  mt: 1.5,
                  borderRadius: 1,
                  overflow: "visible",
                  filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.15))",
                  "&:before": {
                    content: '""',
                    display: "block",
                    position: "absolute",
                    top: 0,
                    left: 14,
                    width: 10,
                    height: 10,
                    bgcolor: "background.paper",
                    transform: "translateY(-50%) rotate(45deg)",
                    zIndex: 0,
                  },
                },
              }}
            >
              {parentCategories.length > 0 ? (
                parentCategories.map((parent) => (
                  <StyledMenuItem
                    key={parent._id}
                    onClick={(e) => handleParentClick(e, parent._id)}
                    component={Link}
                    to={`/shop/${parent._id}`}
                    sx={{
                      fontWeight: 500,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    {parent.name}
                    <KeyboardArrowRightIcon
                      fontSize="small"
                      sx={{ opacity: 0.6, ml: 1 }}
                    />
                  </StyledMenuItem>
                ))
              ) : (
                <MenuItem disabled>Không có danh mục</MenuItem>
              )}
            </Menu>
            <Menu
              anchorEl={childAnchorEl}
              open={Boolean(childAnchorEl)}
              onClose={handleChildMenuClose}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              PaperProps={{
                elevation: 3,
                sx: {
                  width: 300,
                  maxHeight: 350,
                  overflowY: "auto",
                  borderRadius: 1,
                  ml: 1.5,
                  filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.15))",
                },
              }}
            >
              {childCategories[currentParentId]?.length > 0 ? (
                childCategories[currentParentId].map((child) => (
                  <StyledMenuItem
                    key={child._id}
                    component={Link}
                    to={`/shop/${child._id}`}
                    onClick={handleChildMenuClose}
                  >
                    {child.name}
                  </StyledMenuItem>
                ))
              ) : (
                <MenuItem disabled sx={{ p: 1.5 }}>
                  Không có danh mục con
                </MenuItem>
              )}
            </Menu>
          </Box>

          <SearchBox
            sx={{
              order: { xs: 3, sm: 2 },
              width: { xs: "100%", sm: "auto" },
            }}
          >
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Tìm kiếm sản phẩm..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearch}
              sx={{ height: "42px", fontSize: "15px" }}
            />
          </SearchBox>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              order: { xs: 1, sm: 3 },
              ml: { sm: 2, md: 3 },
              gap: { xs: 0.5, sm: 1, md: 2 },
            }}
          >
            <Tooltip title="Sản phẩm yêu thích">
              <StyledIconButton>
                <Badge
                  badgeContent={0}
                  color="error"
                  sx={{
                    "& .MuiBadge-badge": {
                      fontSize: 10,
                      height: 18,
                      minWidth: 18,
                    },
                  }}
                >
                  <FavoriteIcon sx={{ fontSize: 24 }} />
                </Badge>
              </StyledIconButton>
            </Tooltip>

            <Tooltip title="Giỏ hàng">
              <StyledIconButton component={Link} to="/cart">
                <Badge
                  badgeContent={cartCount}
                  color="error"
                  sx={{
                    "& .MuiBadge-badge": {
                      fontSize: 10,
                      height: 18,
                      minWidth: 18,
                    },
                  }}
                >
                  <ShoppingCartIcon sx={{ fontSize: 24 }} />
                </Badge>
              </StyledIconButton>
            </Tooltip>

            {user ? (
              <>
                <Tooltip title={user.email}>
                  <StyledIconButton onClick={handleUserMenuOpen}>
                    {user.avatar ? (
                      <Avatar src={user.avatar} alt="User Avatar" />
                    ) : (
                      <AccountCircleIcon sx={{ fontSize: 26 }} />
                    )}
                  </StyledIconButton>
                </Tooltip>
                <Menu
                  anchorEl={anchorUserEl}
                  open={Boolean(anchorUserEl)}
                  onClose={handleUserMenuClose}
                >
                  <MenuItem component={Link} to="/account">
                    Thông tin tài khoản
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    to="/orders"
                    onClick={handleUserMenuClose}
                  >
                    Đơn hàng
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>Đăng xuất</MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Tooltip title="Tài khoản">
                  <StyledIconButton onClick={handleUserMenuOpen}>
                    <AccountCircleIcon sx={{ fontSize: 26 }} />
                  </StyledIconButton>
                </Tooltip>
                <Menu
                  anchorEl={anchorUserEl}
                  open={Boolean(anchorUserEl)}
                  onClose={handleUserMenuClose}
                >
                  <MenuItem component={Link} to="/login">
                    Đăng nhập
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>

      <Divider sx={{ display: { sm: "none" } }} />
      {mobileMenuOpen && (
        <Box
          sx={{
            display: { xs: "flex", sm: "none" },
            flexDirection: "column",
            p: 2,
            bgcolor: "background.paper",
          }}
        >
          <Button
            component={Link}
            to="/account"
            sx={{
              justifyContent: "flex-start",
              py: 1.5,
              textTransform: "none",
              color: "text.primary",
            }}
          >
            Tài khoản của tôi
          </Button>
        </Box>
      )}
    </StyledAppBar>
  );
};

export default Header;