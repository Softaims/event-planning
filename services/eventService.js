const axios = require("axios");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const stopword = require("stopword");
const { prisma } = require("../db");
const { v4: uuidv4 } = require("uuid");
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
  city,
  latitude,
  longitude,
  eventCategory,
  size,
  page,
  radius,
}) => {
  try {
    // const filteredQuery = filterQuery(query);
    const formattedEventCategory = formatMultipleParams(eventCategory);
   

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


exports.getEventAttendance = async (eventId) => {
  if (!eventId) throw new Error("Event ID is required");

  const attendance = await prisma.eventAttendance.findMany({
    where: {
      eventId,
      isGoing: true,
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

exports.getEventsFromDb = async () => {

  return await prisma.event.findMany({
    where: {
      source: "uni",
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

exports.isUserGoing = async (eventId, userId) => {
  const attendance = await prisma.eventAttendance.findFirst({
    where: { eventId, userId },
  });

  return { isGoing: attendance ? attendance.isGoing : false };
};

exports.getEventDetails = async ({ eventId, userId }) => {
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

exports.createEvent = async ({ userId, eventData }) => {
  const event = await prisma.event.create({
    data: {
      ...eventData,
      createdBy: {
        connect: { id: userId },
      },
    },
  });

  return event;
};

exports.updateEvent = async (eventId, updateData) => {
  let record = await prisma.event.findUnique({
    where: { id: eventId },
  });
  if (!record) {
    return null
  }
  return await prisma.event.update({
    where: { id: eventId },
    data: updateData,
  });
};

exports.deleteEvent = async (eventId) => {
    let record = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!record) {
      return null;
    }
  return await prisma.event.delete({
    where: { id: eventId },
  });
};

exports.getUserEvents = async (userId) => {
  return await prisma.event.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

exports.handleInteraction = async ({
  userId,
  eventId,
  isLiked,
  isGoing,
  eventData,
}) => {

  const isUserCreated = eventData?.source === "uni" || !eventData;


  if (!isUserCreated && eventData) {
    let event = await prisma.event.findFirst({
      where: {
        externalId: eventId,
      },
    });

    // If external event doesn't exist, create it
    if (!event) {
      event = await prisma.event.create({
        data: {
          id: uuidv4(), // Generate a new internal ID
          externalId: eventId, // Store the external ID
          name: eventData.name,
          description: eventData.description || "",
          source: eventData.source,
          image: eventData.image || "",
          location: eventData.location || "",
          dateTime: eventData.dateTime
            ? new Date(eventData.dateTime)
            : new Date(),
          ageMin: eventData.ageMin || null,
          ageMax: eventData.ageMax || null,
          ticketUrls: eventData.ticketUrls || [],
          preferences: eventData.preferences || null,
          // No userId or createdBy for external events
        },
      });


      // Update eventId to use the internal ID for the attendance record
      eventId = event.id;
    } else {
      // Use the internal ID for the attendance record
      eventId = event.id;
    }
  }

  // Find existing attendance record
  const existingAttendance = await prisma.eventAttendance.findUnique({
    where: {
      eventId_userId: {
        eventId: eventId,
        userId: userId,
      },
    },
  });

  // Prepare update data - only include fields that were provided
  const updateData = {};
  if (isLiked !== undefined) updateData.isLiked = isLiked;
  if (isGoing !== undefined) updateData.isGoing = isGoing;

  // Update or create attendance record
  let attendanceRecord;

  if (existingAttendance) {
    // Update existing record with only the fields that were provided
    attendanceRecord = await prisma.eventAttendance.update({
      where: {
        id: existingAttendance.id,
      },
      data: updateData,
    });
    logger.info(
      `Updated attendance record for user ${userId} and event ${eventId}`
    );
  } else {
    // Create new record
    attendanceRecord = await prisma.eventAttendance.create({
      data: {
        id: uuidv4(),
        eventId: eventId,
        userId: userId,
        isLiked: isLiked ?? false,
        isGoing: isGoing ?? false,
      },
    });
    logger.info(
      `Created new attendance record for user ${userId} and event ${eventId}`
    );
  }

  return attendanceRecord;
};

exports.getUserEvents = async (userId) => {
  // Fetch events created by the user
  const events = await prisma.event.findMany({
    where: {
      userId: userId,
      source: "uni", // Only user-created events
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return events;
};

exports.getUserInteractions = async (userId) => {
  // Fetch all attendance records
  const attendanceRecords = await prisma.eventAttendance.findMany({
    where: { userId },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Collect all event IDs from attendance records
  const eventIds = attendanceRecords.map((record) => record.eventId);

  // Fetch all events in a single query
  const events = eventIds.length
    ? await prisma.event.findMany({
        where: { id: { in: eventIds } },
      })
    : [];

  // Combine attendance data with event data
  return attendanceRecords.map((record) => {
    const eventData = events.find((e) => e.id === record.eventId);

    // Determine if this is a user-created event or external event
    const isUserCreated = eventData?.source === "uni";

    let filteredEvent = null;

    if (eventData) {
      // Remove fields we don't want to expose
      const { preferences, createdAt, updatedAt, ...rest } = eventData;
      filteredEvent = rest;
    }

    return {
      interactionId: record.id,
      eventId: record.eventId,
      isLiked: record.isLiked,
      isGoing: record.isGoing,
      interactionDate: record.createdAt,
      event: filteredEvent,
      isUserCreated: isUserCreated,
    };
  });
};


exports.filterEventsByUserPreferences =async (userPreferences, events) => {
  if (!userPreferences || !events || events.length === 0) return [];

  return events.filter((event) => {
    let isMatch = false;

    // ✅ Match by interests
    if (userPreferences.interests && event.category) {
      Object.values(userPreferences.interests).forEach((interestList) => {
        if (interestList.includes(event.category)) {
          isMatch = true;
        }
      });
    }

    // ✅ Match by music genre
    if (
      userPreferences.musicGenre &&
      event.musicGenre === userPreferences.musicGenre
    ) {
      isMatch = true;
    }

    // ✅ Match by favorite artists
    if (userPreferences.favoriteArtists && event.artist) {
      userPreferences.favoriteArtists.forEach((artist) => {
        if (event.artist.includes(artist)) {
          isMatch = true;
        }
      });
    }

    // ✅ Match by favorite places
    if (userPreferences.favoritePlacesToGo && event.venue) {
      userPreferences.favoritePlacesToGo.forEach((place) => {
        if (event.venue.includes(place)) {
          isMatch = true;
        }
      });
    }

    return isMatch;
  });
};
