import express from "express";
import Inventory from "../models/Inventory.js";

const router = express.Router();

// Get all inventory items
router.get("/", async (req, res) => {
  try {
    const inventoryItems = await Inventory.find();
    res.json(inventoryItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get inventory item by ID
router.get("/:id", async (req, res) => {
  try {
    const inventoryItem = await Inventory.findById(req.params.id);
    if (!inventoryItem)
      return res.status(404).json({ message: "Inventory item not found" });
    res.json(inventoryItem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get inventory items by category
router.get("/category/:categoryId", async (req, res) => {
  try {
    const inventoryItems = await Inventory.find({
      category: req.params.categoryId,
    });
    res.json(inventoryItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new inventory item
router.post("/", async (req, res) => {
  const inventoryItem = new Inventory(req.body);
  try {
    const newInventoryItem = await inventoryItem.save();
    res.status(201).json(newInventoryItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update inventory item
router.put("/:id", async (req, res) => {
  try {
    const updatedInventoryItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedInventoryItem)
      return res.status(404).json({ message: "Inventory item not found" });
    res.json(updatedInventoryItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete inventory item
router.delete("/:id", async (req, res) => {
  try {
    const deletedInventoryItem = await Inventory.findByIdAndDelete(
      req.params.id
    );
    if (!deletedInventoryItem)
      return res.status(404).json({ message: "Inventory item not found" });
    res.json({ message: "Inventory item deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
