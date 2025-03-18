import express from "express";
import Discount from "../models/Discount.js";

const router = express.Router();

// Route to get all active discounts
router.get("/active", async (req, res) => {
  try {
    const activeDiscounts = await Discount.findActiveDiscounts();
    res.json(activeDiscounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to activate a discount
router.patch("/:id/activate", async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) {
      return res.status(404).json({ message: "Discount not found" });
    }
    await discount.activate();
    res.json(discount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to deactivate a discount
router.patch("/:id/deactivate", async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) {
      return res.status(404).json({ message: "Discount not found" });
    }
    await discount.deactivate();
    res.json(discount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
