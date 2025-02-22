const axios = require("axios");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const stopword = require("stopword");

// Function to remove stop words
const filterQuery = (query) => {
  if (!query) return "";
  return stopword.removeStopwords(query.split(" ")).join(" ");
};

const GOOGLE_PLACES_URL =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";

const TICKET_MASTER_URL = "https://app.ticketmaster.com/discovery/v2/events";

exports.fetchTicketmasterEvents = async ({
  query,
  placeCategory,
  city,
  latitude,
  longitude,
  eventCategory,
  size,
  page,
  radius,
}) => {
  try {
    const filteredQuery = filterQuery(query);

    const keywords = filteredQuery ? filteredQuery.split(",").join(" OR ") : "";
    const categories = eventCategory ? eventCategory.split(",").join(",") : "";
    const combinedKeywords = placeCategory
      ? ` ${placeCategory.split(",").join(" OR ")}`
      : keywords;

    const response = await axios.get(TICKET_MASTER_URL, {
      params: {
        apikey: process.env.TICKETMASTER_API_KEY,
        keyword: combinedKeywords,
        city,
        latlong: latitude && longitude ? `${latitude},${longitude}` : "",
        radius,
        classificationName: categories,
        size,
        page,
      },
    });

    return response.data._embedded?.events || [];
  } catch (error) {
    logger.error("Error fetching Ticketmaster events:", error);
    throw new AppError("Failed to fetch events from Ticketmaster", 500);
  }
};

exports.fetchEventById = async (id) => {
  try {
    const response = await axios.get(`${TICKET_MASTER_URL}/${id}`, {
      params: { apikey: process.env.TICKETMASTER_API_KEY },
    });

    if (!response.data) {
      throw new AppError("Event not found", 404);
    }

    return response.data;
  } catch (error) {
    logger.error("Error fetching event by ID:", error);
    if (error.response?.status === 404) {
      throw new AppError("Event not found", 404);
    }
    throw new AppError("Failed to fetch event details", 500);
  }
};
exports.fetchGooglePlaces = async ({
  query,
  latitude,
  longitude,
  placeCategory,
  city,
  radius,
  size,
}) => {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    let url = `${GOOGLE_PLACES_URL}?key=${apiKey}&radius=${radius || 5000}`;
    if (query) url += `&query=${encodeURIComponent(query)}`;

    if (latitude && longitude) {
      url += `&location=${latitude},${longitude}`;
    }

    if (placeCategory) url += `&type=${encodeURIComponent(placeCategory)}`;

    if (city) {
      url += `&query=${encodeURIComponent(city)}`;
    }

    const response = await axios.get(url);

    return response.data.results.slice(0, size);
  } catch (error) {
    logger.error("Error fetching Google Places data:", error);
    throw new AppError("Failed to fetch places from Google Places API", 500);
  }
};