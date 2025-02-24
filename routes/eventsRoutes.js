const express = require("express");
const eventsController = require("../controllers/eventsController");
const { eventValidations } = require("../validators/validation");
const upload = require("../utils/multer");
const router = express.Router();

router.get("/", eventsController.getEvents);
router.post("/mark-attendence", eventsController.markAttendance);
router.get("/attendence/:eventId", eventsController.getEventAttendance);
router.get("/:eventId/stats/:userId", eventsController.getEventStats);

router.post("/", eventValidations.createEvent, eventsController.createEvent);

// Get All Events
router.get("/created-events", eventsController.getEvents);

// Update Event
router.put("/:id", eventValidations.updateEvent, eventsController.updateEvent);

// Delete Event
router.delete("/:id", eventsController.deleteEvent);

module.exports = router;
