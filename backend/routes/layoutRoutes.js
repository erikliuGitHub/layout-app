const express = require("express");
const router = express.Router();
const controller = require("../controllers/layoutController");

router.get("/", controller.getTasks);
router.post("/", controller.createTask);

module.exports = router;