const express = require("express");
const eventsController = require("../controllers/eventsController");
const { eventValidations } = require("../validators/validation");
const upload = require("../utils/multer");
const router = express.Router();
const validationMiddleware = require("../middlewares/validationMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", eventsController.getEvents);
router.post("/mark-attendence", eventsController.markAttendance);
router.get("/attendence/:eventId", eventsController.getEventAttendance);
router.get("/:eventId/stats/:userId", eventsController.getEventStats);

router.get("/me", authMiddleware.protect, eventsController.getUserEvents);

router.post(
  "/",
  authMiddleware.protect,
  upload.single("image"),
  eventValidations.createEvent,
  validationMiddleware.validate,
  eventsController.createEvent
);

// Update Event
router.put(
  "/:id",
  authMiddleware.protect,
  eventValidations.updateEvent,
  validationMiddleware.validate,
  eventsController.updateEvent
);

// Delete Event
router.delete("/:id", authMiddleware.protect, eventsController.deleteEvent);

module.exports = router;
