const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const { eventDto, eventListDto } = require("../dtos/eventDto");
const { placeDto, placeListDto } = require("../dtos/placeDto");
const eventService = require("../services/eventService");

exports.getEvents = catchAsync(async (req, res, next) => {
  try {
    let {
      query,
      placeCategory,
      city = "",
      eventCategory = "",
      size = 10,
      page = 1,
      latitude,
      longitude,
      radius,
    } = req.query;

    // Run both API calls in parallel
    const [events, places] = await Promise.all([
      eventService.fetchTicketmasterEvents({
        query,
        placeCategory,
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

    const mergedResults = [
      ...events.map((event) => ({ ...eventDto(event) })),
      ...places.map((place) => ({ ...placeDto(place) })),
    ];

    // Sort by name (optional, adjust as needed)
    mergedResults.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      page,
      size,
      totalElements: mergedResults.length,
      results: mergedResults,
    });
  } catch (error) {
    logger.error("Error in getEventsAndPlaces:", error);
    next(error);
  }
});

exports.markAttendance = catchAsync(async (req, res, next) => {
  try {
    const { eventId, userId, type, status } = req.body;
    const result = await eventService.markAttendance({
      eventId,
      userId,
      type,
      status,
    });

    res.status(200).json({ result });
  } catch (error) {
    logger.error("Error in markAttendance:", error);
    next(new AppError(error.message, 400));
  }
});

// Get attendance for an event/place
exports.getEventAttendance = catchAsync(async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const attendanceData = await eventService.getEventAttendance(eventId);
    res.status(200).json(attendanceData);
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
    res.status(200).json(result);
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

    res.status(200).json(eventStats);
  } catch (error) {
    logger.error("Error in getEventStats:", error);
    next(new AppError(error.message, 400));
  }
});

exports.createEvent = catchAsync(async (req, res, next) => {
  const eventData = req.body;

  const newEvent = await eventService.createEvent(eventData);

  res.status(201).json({
    status: "success",
    message: "Event created successfully.",
    data: { event: newEvent },
  });
});

exports.getEvent = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const event = await eventService.getEvent(id);

  res.status(200).json({
    status: "success",
    message: "Event fetched successfully.",
    data: { event },
  });
});

// Update Event
exports.updateEvent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const eventData = req.body;

  const updatedEvent = await eventService.updateEvent(id, eventData);

  res.status(200).json({
    status: "success",
    message: "Event updated successfully.",
    data: { event: updatedEvent },
  });
});

// Delete Event
exports.deleteEvent = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  await eventService.deleteEvent(id);

  res.status(204).json({
    status: "success",
    message: "Event deleted successfully.",
  });
});
