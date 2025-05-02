const express = require("express");
const eventsController = require("../controllers/eventsController");
const { eventValidations } = require("../validators/validation");
const upload = require("../utils/multer");
const router = express.Router();
const validationMiddleware = require("../middlewares/validationMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const parseJSONFields = require("../middlewares/parseJsonFields");
const extractFilters = require("./../utils/chatGPT"); // Adjust the path as needed
const { prisma } = require("../db");
/**
 * @swagger
 * tags:
 *   name: Events
 *   description: API for event management
 */

/**
 * @swagger
 * /events:
 *   get:
 *     summary: Get a list of events
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for events
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: eventCategory
 *         schema:
 *           type: string
 *         description: Filter by event category
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: List of events retrieved successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get("/", authMiddleware.protect, eventsController.getEvents);

/**
 * @swagger
 * /events/attendance/{eventId}:
 *   get:
 *     summary: Get event attendance details
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Attendance details fetched successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get(
  "/attendance/:eventId",
  authMiddleware.protect,
  eventsController.getEventAttendance
);

router.get("/searchAttendance/:eventId",
  authMiddleware.protect,
  eventsController.searchEventAttendance
)
/**
 * @swagger
 * /events/{eventId}/details:
 *   get:
 *     summary: Get event details
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details fetched successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get(
  "/:eventId/details",
  authMiddleware.protect,
  eventsController.getEventDetails
);

/**
 * @swagger
 * /events/me:
 *   get:
 *     summary: Get user's created and interacted events
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User event overview fetched successfully.
 *       401:
 *         description: Unauthorized.
 */
router.get(
  "/me",
  authMiddleware.protect,
  eventsController.getUserEventOverview
);

/**
 * @swagger
 * /events/interact/{eventId}:
 *   post:
 *     summary: Interact with an event (like or attend)
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isLiked:
 *                 type: boolean
 *                 description: Whether the user liked the event
 *               isGoing:
 *                 type: boolean
 *                 description: Whether the user is attending
 *     responses:
 *       200:
 *         description: Interaction recorded successfully.
 *       401:
 *         description: Unauthorized.
 */
router.post(
  "/interact/:eventId",
  authMiddleware.protect,
  eventsController.handleEventInteraction
);

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               ageMin:
 *                 type: integer
 *               ageMax:
 *                 type: integer
 *               preferences:
 *                 type: string
 *                 description: JSON stringified preferences
 *     responses:
 *       201:
 *         description: Event created successfully.
 *       401:
 *         description: Unauthorized.
 */
router.post(
  "/",
  authMiddleware.protect,
  upload.single("image"),
  parseJSONFields(["preferences", "ticketUrls"]),
  eventValidations.createEvent,
  validationMiddleware.validate,
  eventsController.createEvent
);

/**
 * @swagger
 * /events/{eventId}:
 *   patch:
 *     summary: Update an existing event
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               ageMin:
 *                 type: integer
 *               ageMax:
 *                 type: integer
 *               preferences:
 *                 type: string
 *                 description: JSON stringified preferences
 *     responses:
 *       200:
 *         description: Event updated successfully.
 *       401:
 *         description: Unauthorized.
 */
router.patch(
  "/:eventId",
  authMiddleware.protect,
  upload.single("image"),
  parseJSONFields(["preferences", "ticketUrls"]),
  eventValidations.updateEvent,
  validationMiddleware.validate,
  eventsController.updateEvent
);

/**
 * @swagger
 * /events/{eventId}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully.
 *       401:
 *         description: Unauthorized.
 */
router.delete(
  "/:eventId",
  // authMiddleware.protect,
  eventsController.deleteEvent
);





module.exports = router;
