const express = require("express");
const eventsController = require("../controllers/eventsController");

const upload = require("../utils/multer");
const router = express.Router();

router.get("/", eventsController.getEvents);
router.get("/places", eventsController.getPlaces);

router.get("/:id", eventsController.getEventById);

module.exports = router;