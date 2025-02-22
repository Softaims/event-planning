const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const { eventDto, eventListDto } = require("../dtos/eventDto");
const { placeDto, placeListDto } = require("../dtos/placeDto");
const eventService = require("../services/eventService");

// Get events list (Ticketmaster)
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


    const events = await eventService.fetchTicketmasterEvents({
      query,
      placeCategory,
      city,
      eventCategory,
      size,
      page,
      latitude,
      longitude,
      radius,
    });

    res.status(200).json({
      page,
      size,
      totalElements: events.length,
      events: eventListDto(events),
    });
  } catch (error) {
    logger.error("Error in getEvents:", error);
    next(error);
  }
});

// Get event by ID (Ticketmaster)
exports.getEventById = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(new AppError("Event ID is required", 400));
    }

    const eventData = await eventService.fetchEventById(id);
    res.status(200).json(eventDto(eventData));
  } catch (error) {
    logger.error("Error in getEventById:", error);
    next(error);
  }
});

// Get places (Google Places)
exports.getPlaces = catchAsync(async (req, res, next) => {
  try {
    let {
      query,
      placeCategory,
      city = "",
      size = 10,
      latitude,
      longitude,
      radius,
    } = req.query;

    const places = await eventService.fetchGooglePlaces({
      query,
      placeCategory,
      city,
      latitude,
      longitude,
      radius,
      size: parseInt(size, 10),
    });

    // Transform places data using placeListDto
    const transformedPlaces = placeListDto(places);

    // Send transformed data in the response
    res.status(200).json({
      size: transformedPlaces.length,
      places: transformedPlaces,
    });
  } catch (error) {
    logger.error("Error in getPlaces:", error);
    next(error);
  }
});