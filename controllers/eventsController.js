const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const { eventDto } = require("../dtos/eventDto");
const { placeDto } = require("../dtos/placeDto");
const { dbEventDto } = require("../dtos/dbEventDto");
const eventService = require("../services/eventService");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const s3Service = require("../utils/s3Service");

exports.getEvents = catchAsync(async (req, res, next) => {
  try {
    let {
      query,
      placeCategory,
      city = "",
      eventCategory = "",
      size = 10,
      page = 0,
      latitude,
      longitude,
      radius,
    } = req.query;

    // Run both API calls in parallel
    const [events, places] = await Promise.all([
      eventService.fetchTicketmasterEvents({
        query,
        city,
        eventCategory,
        size,
        page,
        latitude,
        longitude,
        radius,
      }),
      eventService.fetchGooglePlaces({
        query,
        placeCategory,
        city,
        page,
        latitude,
        longitude,
        radius,
        size: parseInt(size, 10),
      }),
    ]);

    // const eventsFromDb = await eventService.getEvents({
    //   page: parseInt(page, 10),
    //   limit: parseInt(size, 10),
    // });

    const mergedResults = [
      ...events.map((event) => ({ ...eventDto(event) })),
      // ...eventsFromDb.map((event) => ({ ...dbEventDto(event) })),
      ...places.map((place) => ({ ...placeDto(place) })),
    ];

    // Sort by name (optional, adjust as needed)
    mergedResults.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      status: "success",
      message: "Events and places fetched successfully.",
      data: {
        page,
        size,
        totalElements: mergedResults.length,
        results: mergedResults,
      },
    });
  } catch (error) {
    logger.error("Error in getEventsAndPlaces:", error);
    next(error);
  }
});

// Get attendance for an event/place
exports.getEventAttendance = catchAsync(async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const attendanceData = await eventService.getEventAttendance(eventId);
    res.status(200).json({
      status: "success",
      message: "Attendance fetched successfully.",
      date: { event: attendanceData },
    });
  } catch (error) {
    logger.error("Error in getEventAttendance:", error);
    next(new AppError(error.message, 400));
  }
});

// Check if a user is attending an event/place
exports.isUserGoing = catchAsync(async (req, res, next) => {
  try {
    const { eventId, userId } = req.params;
    const result = await eventService.isUserGoing(eventId, userId);
    res.status(200).json({
      status: "success",
      message: "Attendance checked successfully.",
      data: { result },
    });
  } catch (error) {
    logger.error("Error in isUserGoing:", error);
    next(new AppError(error.message, 400));
  }
});

exports.getEventStats = catchAsync(async (req, res, next) => {
  try {
    const { eventId, userId } = req.params;
    const eventStats = await eventService.getEventStats({
      eventId,
      userId,
    });

    res.status(200).json({
      status: "success",
      message: "Event stats fetched successfully.",
      data: { event: eventStats },
    });
  } catch (error) {
    logger.error("Error in getEventStats:", error);
    next(new AppError(error.message, 400));
  }
});

exports.createEvent = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("You are not logged in!", 401));
  }

  const eventData = {
    ...req.body,
    source: "uni",
    ageMin: parseInt(req.body.ageMin, 10),
    ageMax: parseInt(req.body.ageMax, 10),
    userId: req.user.id,
  };

  // Handle image upload
  if (req.file) {
    const fileName = `event-${eventData.name}-${Date.now()}.jpg`;
    const fileBuffer = req.file.buffer;

    let imageUrl = null;

    if (process.env.NODE_ENV === "development") {
      const localDir = path.join(__dirname, "../public/images/events");
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      const localPath = path.join(localDir, fileName);
      fs.writeFileSync(localPath, fileBuffer);
      imageUrl = `/public/images/events/${fileName}`;
      logger.info(`Event image stored locally: ${imageUrl}`);
    } else {
      imageUrl = await s3Service.uploadToS3(fileBuffer, fileName, "image");
      logger.info(`Event image uploaded to S3: ${imageUrl}`);
    }
    eventData.image = imageUrl;
  }

  // Create event in database
  const newEvent = await eventService.createEvent(eventData);

  res.status(201).json({
    status: "success",
    message: "Event created successfully.",
    data: { event: newEvent },
  });
});

exports.updateEvent = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("You are not logged in!", 401)); // User is not logged in
  }

  const { id } = req.params;
  const eventData = req.body;

  // Check if event exists and is owned by the user
  const updatedEvent = await eventService.updateEvent(
    id,
    eventData,
    req.user.id
  );

  res.status(200).json({
    status: "success",
    message: "Event updated successfully.",
    data: { event: updatedEvent },
  });
});



exports.deleteEvent = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("You are not logged in!", 401));
  }

  const { id } = req.params;

  // Check if event exists and is owned by the user
  await eventService.deleteEvent(id, req.user.id);

  res.status(204).json({
    status: "success",
    message: "Event deleted successfully.",
  });
});

exports.handleEventInteraction = catchAsync(async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("You are not logged in!", 401));
    }

    const {
      eventId, // ID of the event (internal or external)
      isLiked, // Boolean value for like status
      isGoing, // Boolean value for going status
      eventData, // Additional event data for external events
    } = req.body;

    const userId = req.user.id;

    // Validate input
    if (!eventId) {
      return next(new AppError("Event ID is required", 400));
    }

    // Check if isLiked and isGoing are boolean or undefined
    if (isLiked !== undefined && typeof isLiked !== "boolean") {
      return next(new AppError("isLiked must be a boolean value", 400));
    }

    if (isGoing !== undefined && typeof isGoing !== "boolean") {
      return next(new AppError("isGoing must be a boolean value", 400));
    }

    // Handle the interaction through the service
    const attendanceRecord = await eventService.handleInteraction({
      userId,
      eventId,
      isLiked,
      isGoing,
      eventData,
    });

    res.status(200).json({
      status: "success",
      message: "Event interaction processed successfully",
      data: {
        attendance: attendanceRecord,
      },
    });
  } catch (error) {
    logger.error("Error handling event interaction:", error);
    next(new AppError(error.message, 400));
  }
});



exports.removeEventInteraction = catchAsync(async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("You are not logged in!", 401));
    }

    const { eventId } = req.params;
    const userId = req.user.id;

    if (!eventId) {
      return next(new AppError("Event ID is required", 400));
    }

    await eventService.removeInteraction(userId, eventId);

    res.status(200).json({
      status: "success",
      message: "Event interaction removed successfully",
    });
  } catch (error) {
    logger.error("Error removing event interaction:", error);
    next(new AppError(error.message, 400));
  }
});











exports.getUserEventOverview = catchAsync(async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("You are not logged in!", 401));
    }

    const userId = req.user.id;

    // Fetch user-created events
    const createdEvents = await eventService.getUserEvents(userId);

    // Fetch user interactions
    const likedEvents = await eventService.getUserInteractions(userId, "liked");
    const goingEvents = await eventService.getUserInteractions(userId, "going");

    // Fetch events user explicitly marked as "not going"
    const notGoingEvents = await prisma.eventAttendance.findMany({
      where: {
        userId,
        isGoing: false,
      },
      include: {
        event: true, // Include related event data
      },
    });

    res.status(200).json({
      status: "success",
      message: "User event overview retrieved successfully",
      data: {
        createdEvents,
        likedEvents,
        goingEvents,
        notGoingEvents: notGoingEvents.map((record) => record.event), // Extract event data
      },
    });
  } catch (error) {
    logger.error("Error getting user event overview:", error);
    next(new AppError(error.message, 400));
  }
});
