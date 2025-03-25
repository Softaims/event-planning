const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const { eventDto } = require("../dtos/eventDto");
const { placeDto } = require("../dtos/placeDto");
const { dbEventDto } = require("../dtos/dbEventDto");
const eventService = require("../services/eventService");
const authService = require("../services/authService");
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
  const userData = await authService.findUserById(userId);

  if (!latitude || !longitude) {
    latitude = userData?.lat;
    longitude = userData?.long;
  }

  // Calculate sizes for each source
  const perSourceSize = Math.floor(size / 3);
  const remainingSize = size % 3;

  const [events, places, eventsFromDb] = await Promise.all([
    eventService.fetchTicketmasterEvents({
      query,
      city,
      eventCategory,
      size: perSourceSize + (remainingSize > 0 ? 1 : 0),
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
      size: perSourceSize + (remainingSize > 1 ? 1 : 0),
    }),
    eventService.getEventsFromDb(),
  ]);

  const filteredEvents = userData?.preferences
    ? await eventService.filterEventsByUserPreferences(
        userData.preferences,
        eventsFromDb
      )
    : eventsFromDb;

  const latestFilteredEvents = filteredEvents
    .filter((event) => event.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, perSourceSize);

  let mergedResults = [
    ...events.map((event) => ({ ...eventDto(event) })),
    ...latestFilteredEvents.map((event) => ({ ...dbEventDto(event) })),
    ...places.map((place) => ({ ...placeDto(place) })),
  ];

  // Filter out objects with null location, image, or dateTime
  // mergedResults = mergedResults.filter(
  //   (event) => event.location && event.image && event.dateTime
  // );

  // // Sort and limit to exact size
  // mergedResults.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  // const finalResults = mergedResults.slice(0, size);

  // console.log(finalResults, "filtered results");

  res.status(200).json({
    status: "success",
    message: "Events and places fetched successfully.",
    data: {
      page,
      total: mergedResults.length,
      results:  mergedResults,
    },
  });
});


exports.getEventAttendance = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const userId = req.user.id;

  if (!eventId) {
    return next(new AppError("Event ID is required.", 401));
  }

  // Get full user data including preferences
  const userData = await authService.findUserById(userId);

  // Pass the current user data to getEventAttendance function
  const attendanceData = await eventService.getEventAttendance(
    eventId,
    userData
  );

  res.status(200).json({
    status: "success",
    message: "Attendance fetched successfully.",
    data: { event: attendanceData },
  });
});

exports.searchEventAttendance = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const userId = req.user.id;
  const query = req.query.q;

  if (!eventId) {
    return next(new AppError("Event ID is required.", 400)); // 400 instead of 401
  }

  if (!query) {
    return next(new AppError("Query parameter 'q' is required.", 400));
  }

  // Get full user data including preferences
  const currentUser = await authService.findUserById(userId);

  if (!currentUser) {
    return next(new AppError("User not found.", 404));
  }

  // Call eventService with corrected argument order
  const attendanceData = await eventService.searchEventAttendance(
    query, // Pass query first
    eventId,
    currentUser
  );

  res.status(200).json({
    status: "success",
    message: "Attendance fetched successfully.",
    data: { event: attendanceData },
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

  // Fetch event details
  const eventDetails = await eventService.getEventDetails({
    eventId,
    userId,
  });

  // Fetch user interaction details
  const interaction = await eventService.getUserEventInteraction(
    eventId,
    userId
  );

  // Construct interaction data with default values if no interaction exists
  const interactionData = interaction
    ? {
        isLiked: interaction.isLiked || false,
        isGoing: interaction.isGoing || false,
      }
    : {
        isLiked: false,
        isGoing: false,
      };

  res.status(200).json({
    status: "success",
    message: "Event Details fetched successfully.",
    data: {
      event: eventDetails,
      interaction: interactionData,
    },
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
exports.createEvent = catchAsync(async (req, res, next) => {
  const eventData = {
    ...req.body,
    source: "uni",
    ageMin: req.body.ageMin ? parseInt(req.body.ageMin, 10) : null,
    ageMax: req.body.ageMax ? parseInt(req.body.ageMax, 10) : null,
  };

  let imageUrl = null;

  // Handle image upload
  if (req.file) {
    const eventNameSanitized = req.body.name.replace(/[^a-zA-Z0-9-_ ]/g, ""); // Remove invalid characters
    const fileName = `event-${eventNameSanitized}-${Date.now()}.jpg`;
    const fileBuffer = req.file.buffer;

    if (process.env.NODE_ENV === "development") {
      const localDir = path.join(__dirname, "../public/images");
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      const localPath = path.join(localDir, fileName);
      fs.writeFileSync(localPath, fileBuffer);
      imageUrl = `/public/images/${fileName}`;
      logger.info(`Event image stored locally: ${imageUrl}`);
    } else {
      imageUrl = await s3Service.uploadToS3(fileBuffer, fileName, "image");
      logger.info(`Event image uploaded to S3: ${imageUrl}`);
    }
    eventData.image = imageUrl;
  }

  // Create event in the database
  const newEvent = await eventService.createEvent({
    userId: req.user.id,
    eventData,
  });

  // Update the event to set externalId = id
  await eventService.updateEvent(newEvent.id, { externalId: newEvent.id });

  res.status(200).json({
    status: "success",
    message: "Event created successfully.",
    data: { event: { ...newEvent, externalId: newEvent.id } },
  });
});


exports.checkUserInteraction = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  const userId = req.user.id;

  // Validate input
  if (!eventId) {
    return next(new AppError("Event ID is required.", 401));
  }

  if (!userId) {
    return next(new AppError("User ID is required.", 401));
  }

  if (req.user.id !== userId) {
    return next(
      new AppError(
        "You don't have permission to view this user's interactions.",
        401
      )
    );
  }

  // Get the user's interaction with this event from the service
  const interaction = await eventService.getUserEventInteraction(
    eventId,
    userId
  );

  if (!interaction) {
    return res.status(200).json({
      status: "success",
      message: "No interaction found for this user and event.",
      data: {
        isLiked: false,
        isGoing: false,
      },
    });
  }

  res.status(200).json({
    status: "success",
    message: "User interaction details fetched successfully.",
    data: {
      isLiked: interaction.isLiked || false,
      isGoing: interaction.isGoing || false,
    },
  });
});

exports.updateEvent = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  if (!eventId) {
    return next(new AppError("Event ID is required.", 401));
  }

  // Check if the user is the owner of the event or an admin
  const event = await eventService.getEventById(eventId);
  if (!event) {
    return next(new AppError("Event not found", 401));
  }

  // Verify user has permission to update this event
  if (event.userId.toString() !== req.user.id.toString()) {
    return next(
      new AppError("You don't have permission to update this event.", 401)
    );
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

  // Fetch the event from the service layer
  const event = await eventService.getEventById(eventId);
  if (!event) {
    return next(new AppError("Event not found", 401));
  }

  // Ensure both userId and req.user.id are of the same type (either both as strings or both as integers)
  if (event.userId.toString() !== req.user.id.toString()) {
    return next(
      new AppError("You don't have permission to delete this event.", 401)
    );
  }

  // Proceed to delete the event
  const deletedEvent = await eventService.deleteEvent(eventId);

  res.status(200).json({
    status: "success",
    message: "Event deleted successfully.",
  });
});
