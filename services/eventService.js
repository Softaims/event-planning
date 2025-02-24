const axios = require("axios");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const stopword = require("stopword");
const { prisma } = require("../db");

const GOOGLE_PLACES_URL =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";

const TICKET_MASTER_URL = "https://app.ticketmaster.com/discovery/v2/events";

const calculateInterestMatch = (currentUserPrefs, attendeePrefs) => {
  if (!attendeePrefs.length) return 0;

  const attendeeMatches = attendeePrefs.map((attendeePrefs) => {
    if (!attendeePrefs) return 0;

    let matchScore = 0;
    let totalWeight = 0;

    // Convert nested interest objects into a flat array of interests
    const extractInterests = (interestsObj) => {
      if (!interestsObj || typeof interestsObj !== "object") return [];
      return Object.values(interestsObj)
        .flat()
        .map((i) => i.toLowerCase().trim());
    };

    const currentUserInterests = extractInterests(currentUserPrefs.interests);
    const attendeeInterests = extractInterests(attendeePrefs.interests);

    // Interest match (weighted at 100%)
    if (currentUserInterests.length > 0 && attendeeInterests.length > 0) {
      totalWeight += 100;
      const commonInterests = currentUserInterests.filter((interest) =>
        attendeeInterests.includes(interest)
      ).length;

      if (commonInterests > 0) {
        const maxInterests = Math.max(
          currentUserInterests.length,
          attendeeInterests.length
        );
        matchScore += (commonInterests / maxInterests) * 100;
      }
    }

    return totalWeight > 0 ? (matchScore / totalWeight) * 100 : 0;
  });

  // Calculate the average match percentage across all attendees
  const averageMatch =
    attendeeMatches.reduce((sum, score) => sum + score, 0) /
    attendeeMatches.length;

  return Math.round(Math.min(averageMatch, 100));
};

const filterQuery = (query) => {
  if (!query) return "";
  if (Array.isArray(query)) {
    return stopword.removeStopwords(query.map((word) => word.trim())).join(" ");
  }
  return stopword
    .removeStopwords(query.split(",").map((word) => word.trim()))
    .join(" ");
};

const formatMultipleParams = (param) => {
  if (!param) return "";
  return Array.isArray(param)
    ? param.join("|")
    : param
        .split(",")
        .map((p) => p.trim())
        .join("|");
};

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
    console.log("filteredQuery", filteredQuery);
    const formattedEventCategory = formatMultipleParams(eventCategory);
    console.log("formattedEventCategory", formattedEventCategory);
    const formattedPlaceCategory = formatMultipleParams(placeCategory);
    console.log("formattedPlaceCategory", formattedPlaceCategory);
    const response = await axios.get(TICKET_MASTER_URL, {
      params: {
        apikey: process.env.TICKETMASTER_API_KEY,
        city,
        classificationName: formattedEventCategory,
        latlong: latitude && longitude ? `${latitude},${longitude}` : "",
        radius,
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

exports.fetchGooglePlaces = async ({
  query,
  latitude,
  page,
  longitude,
  placeCategory,
  city,
  radius,
  size,
}) => {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new AppError("Google Places API key is missing", 500);
    }
    let url = `${GOOGLE_PLACES_URL}?key=${apiKey}`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (city) {
      url += ` in${encodeURIComponent(city)}`;
    }

    if (latitude && longitude) {
      url += `&location=${latitude},${longitude}&radius=${radius || 5000}`;
    }
    if (placeCategory) url += `&type=${encodeURIComponent(placeCategory)}`;

    const response = await axios.get(url);

    if (response.data.status !== "OK") {
      logger.error(`Google Places API error: ${response.data.status}`);
      return [];
    }

    logger.info("Google Places API results:", response.data.results.length);

    return response.data.results.slice(0, size);
  } catch (error) {
    logger.error("Error fetching Google Places data:", error);
    throw new AppError("Failed to fetch places from Google Places API", 500);
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

// Get attendees of an event/place
exports.getEventAttendance = async (eventId) => {
  if (!eventId) throw new Error("Event ID is required");

  const attendance = await prisma.eventAttendance.findMany({
    where: {
      eventId,
      status: "GOING",
    },
    include: { user: true },
  });

  return {
    totalAttendees: attendance.length,
    attendees: attendance.map((a) => ({
      userId: a.userId,
      name: `${a.user.firstName} ${a.user.lastName}`,
      profileImage: a.user.profileImage,
    })),
  };
};

// Check if a user is going to an event/place
exports.isUserGoing = async (eventId, userId) => {
  if (!eventId || !userId) throw new Error("Event ID and User ID are required");

  const attendance = await prisma.eventAttendance.findFirst({
    where: { eventId, userId: parseInt(userId) },
  });

  return { isGoing: attendance ? attendance.status === "GOING" : false };
};

// Mark attendance for an event/place
exports.markAttendance = async ({ eventId, userId, type, status }) => {
  if (!eventId || !userId || !status) {
    throw new Error("Event ID, User ID, and status are required");
  }

  const existingAttendance = await prisma.eventAttendance.findFirst({
    where: { eventId, userId: parseInt(userId) },
  });

  if (existingAttendance) {
    return await prisma.eventAttendance.update({
      where: { id: existingAttendance.id },
      data: { status },
    });
  } else {
    return await prisma.eventAttendance.create({
      data: {
        eventId,
        userId: parseInt(userId),
        type,
        status,
      },
    });
  }
};

// Get stats about an event based on the current user preferences
exports.getEventStats = async ({ eventId, userId }) => {
  if (!eventId || !userId) {
    throw new Error("Event ID and User ID are required");
  }

  // Fetch attendees
  const attendees = await prisma.eventAttendance.findMany({
    where: { eventId },
    include: { user: true },
  });

  if (attendees.length === 0) {
    return {
      message: "No attendees yet for this event.",
      totalPeopleHere: 0,
      peakCrowdFromCollege: null,
      studentsFromSchool: 0,
      musicTasteMatch: 0,
      sameMajorCount: 0,
      interestMatchPercentage: 0,
    };
  }

  const totalPeopleHere = attendees.length;

  // Fetch the current user for comparison
  const currentUser = await prisma.user.findUnique({
    where: { id: parseInt(userId) },
    select: {
      id: true,
      preferences: true,
    },
  });

  if (!currentUser) {
    throw new Error("User not found");
  }

  // Find peak crowd from college
  const collegeCounts = {};
  attendees.forEach((a) => {
    const college = a.user?.preferences?.college || "No College";
    collegeCounts[college] = (collegeCounts[college] || 0) + 1;
  });

  let peakCrowdFromCollege = null;
  let maxCount = 0;

  Object.entries(collegeCounts).forEach(([college, count]) => {
    if (count > maxCount && college !== "No College") {
      maxCount = count;
      peakCrowdFromCollege = college;
    }
  });

  // Count students from the current user's college
  const studentsFromSchool = attendees.filter((a) => {
    return (
      a.user?.preferences?.college &&
      currentUser?.preferences?.college &&
      a.user.preferences.college.toLowerCase() ===
        currentUser.preferences.college.toLowerCase()
    );
  }).length;

  // Count users with the same major
  const sameMajorCount = attendees.filter((a) => {
    return (
      a.user?.preferences?.major &&
      currentUser?.preferences?.major &&
      a.user.preferences.major.toLowerCase() ===
        currentUser.preferences.major.toLowerCase()
    );
  }).length;

  // Count users with the same music genre
  const musicTasteMatch = attendees.filter((a) => {
    return (
      a.user?.preferences?.musicGenre &&
      currentUser?.preferences?.musicGenre &&
      a.user.preferences.musicGenre.toLowerCase() ===
        currentUser.preferences.musicGenre.toLowerCase()
    );
  }).length;

  // Calculate interest match percentage
  const interestMatchPercentage = calculateInterestMatch(
    currentUser.preferences,
    attendees
      .filter((a) => a.user.id !== currentUser.id)
      .map((a) => a.user.preferences)
  );

  return {
    totalPeopleHere,
    peakCrowdFromCollege,
    studentsFromSchool,
    musicTasteMatch,
    sameMajorCount,
    interestMatchPercentage,
  };
};

exports.createEvent = async (eventData) => {
  const event = await prisma.event.create({
    data: eventData,
  });

  return event;
};

// Get All Events
exports.getEvents = async (filters) => {
  const { page = 1, limit = 10, startDate, endDate, location } = filters;

  const where = {};

  if (startDate) {
    where.eventStart = { gte: new Date(startDate) };
  }

  if (endDate) {
    where.eventEnd = { lte: new Date(endDate) };
  }

  if (location) {
    where.location = { contains: location };
  }

  const events = await prisma.event.findMany({
    where,
    skip: (page - 1) * limit,
    take: Number(limit),
    orderBy: { eventStart: "asc" },
  });

  return events;
};

// Get Single Event
exports.getEvent = async (id) => {
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  return event;
};

// Update Event
exports.updateEvent = async (id, eventData) => {
  const existingEvent = await prisma.event.findUnique({
    where: { id },
  });

  if (!existingEvent) {
    throw new AppError("Event not found", 404);
  }

  const updatedEvent = await prisma.event.update({
    where: { id },
    data: eventData,
  });

  return updatedEvent;
};

// Delete Event
exports.deleteEvent = async (id) => {
  const existingEvent = await prisma.event.findUnique({
    where: { id },
  });

  if (!existingEvent) {
    throw new AppError("Event not found", 404);
  }

  await prisma.event.delete({
    where: { id },
  });
};
