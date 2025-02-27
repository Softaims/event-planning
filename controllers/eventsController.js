const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const { eventDto } = require("../dtos/eventDto");
const { placeDto } = require("../dtos/placeDto");
const { dbEventDto } = require("../dtos/dbEventDto");
const eventService = require("../services/eventService");
const userService = require("../services/userService");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const s3Service = require("../utils/s3Service");

exports.getEvents = catchAsync(async (req, res, next) => {
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

  size = parseInt(size, 10);
  page = parseInt(page, 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(size) || size < 1) size = 10;

  const userId = req.user.id;

  if (!latitude || !longitude) {
    const user = await userService.getUserById(userId);
    latitude = user?.lat;
    longitude = user?.long;
  }

  const [events, places, eventsFromDb] = await Promise.all([
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
      size,
    }),
    eventService.getLatestEvents(page, size),
  ]);

  const mergedResults = [
    ...events.map((event) => ({ ...eventDto(event) })),
    ...eventsFromDb.map((event) => ({ ...dbEventDto(event) })),
    ...places.map((place) => ({ ...placeDto(place) })),
  ];

  mergedResults.sort((a, b) => a.name.localeCompare(b.name));

  res.status(200).json({
    status: "success",
    message: "Events and places fetched successfully.",
    data: {
      page,
      total: mergedResults.length,
      results: mergedResults,
    },
  });
});

exports.getEventAttendance = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  if (!eventId) {
    return next(new AppError("Event ID is required.", 401));
  }
  const attendanceData = await eventService.getEventAttendance(eventId);
  res.status(200).json({
    status: "success",
    message: "Attendance fetched successfully.",
    date: { event: attendanceData },
  });
});

exports.isUserGoing = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  if (!eventId) {
    return next(new AppError("Event ID is required.", 401));
  }
  const userId = req.user.id;
  const result = await eventService.isUserGoing(eventId, userId);
  res.status(200).json({
    status: "success",
    message: "Attendance checked successfully.",
    data: { result },
  });
});

exports.getEventDetails = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  if (!eventId) {
    return next(new AppError("Event ID is required.", 401));
  }
  const userId = req.user.id;
  const eventDetails = await eventService.getEventDetails({
    eventId,
    userId,
  });

  res.status(200).json({
    status: "success",
    message: "Event Details fetched successfully.",
    data: { event: eventDetails },
  });
});

exports.createEvent = catchAsync(async (req, res, next) => {
  const eventData = {
    ...req.body,
    source: "uni",
    ageMin: parseInt(req.body.ageMin, 10),
    ageMax: parseInt(req.body.ageMax, 10),
  };

  let imageUrl = null;
  // Handle image upload
  if (req.file) {
    const fileName = `event-${eventData.name}-${Date.now()}.jpg`;
    const fileBuffer = req.file.buffer;

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
  const newEvent = await eventService.createEvent({
    userId: req.user.id,
    eventData,
  });

  res.status(201).json({
    status: "success",
    message: "Event created successfully.",
    data: { event: newEvent },
  });
});

exports.getUserEventOverview = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const createdEvents = await eventService.getUserEvents(userId);
  const interactedEvents = await eventService.getUserInteractions(userId);

  res.status(200).json({
    status: "success",
    message: "User event overview retrieved successfully",
    data: {
      createdEvents,
      interactedEvents,
    },
  });
});

exports.handleEventInteraction = catchAsync(async (req, res, next) => {
  const { isLiked, isGoing, eventData } = req.body;
  const { eventId } = req.params;
  const userId = req.user.id;

  // Validate input
  if (!eventId) {
    return next(new AppError("Event ID is required", 401));
  }
  if (isLiked === undefined && isGoing === undefined) {
    return next(
      new AppError("Either 'isLiked' or 'isGoing' must be provided.", 400)
    );
  }
  // Check if isLiked and isGoing are boolean or undefined
  if (isLiked !== undefined && typeof isLiked !== "boolean") {
    return next(new AppError("isLiked must be a boolean value", 401));
  }

  if (isGoing !== undefined && typeof isGoing !== "boolean") {
    return next(new AppError("isGoing must be a boolean value", 401));
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
});

exports.updateEvent = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  if (!eventId) {
    return next(new AppError("Event ID is required.", 401));
  }
  const updateData = {
    ...req.body,
    ageMin: req.body.ageMin ? parseInt(req.body.ageMin, 10) : undefined,
    ageMax: req.body.ageMax ? parseInt(req.body.ageMax, 10) : undefined,
  };

  if (req.file) {
    const fileName = `event-${updateData.name || eventId}-${Date.now()}.jpg`;
    const fileBuffer = req.file.buffer;

    if (process.env.NODE_ENV === "development") {
      const localDir = path.join(__dirname, "../public/images/events");
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      const localPath = path.join(localDir, fileName);
      fs.writeFileSync(localPath, fileBuffer);
      updateData.image = `/public/images/events/${fileName}`;
      logger.info(`Updated event image stored locally: ${updateData.image}`);
    } else {
      updateData.image = await s3Service.uploadToS3(
        fileBuffer,
        fileName,
        "image"
      );
      logger.info(`Updated event image uploaded to S3: ${updateData.image}`);
    }
  }

  const updatedEvent = await eventService.updateEvent(eventId, updateData);

  if (!updatedEvent) {
    return next(new AppError("Event not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Event updated successfully.",
    data: { event: updatedEvent },
  });
});

exports.deleteEvent = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  if (!eventId) {
    return next(new AppError("Event ID is required.", 401));
  }
  const deletedEvent = await eventService.deleteEvent(eventId);

  if (!deletedEvent) {
    return next(new AppError("Event not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Event deleted successfully.",
  });
});