const axios = require("axios");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const stopword = require("stopword");
const { prisma } = require("../db");
const { v4: uuidv4 } = require("uuid");
const {
  calculateMatchPercentage,
} = require("../utils/calculateMatchPercentage ");

const GOOGLE_PLACES_TEXT_SEARCH_URL =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";
const GOOGLE_PLACES_NEARBY_SEARCH_URL =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

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
  if (!query || typeof query !== "string") return "";

  // Split by space (assuming words are space-separated), trim, remove stopwords, and rejoin
  return stopword
    .removeStopwords(query.split(" ").map((word) => word.trim()))
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
  longitude,
  placeCategory,
  city,
  radius = 5000,
  size = 10,
}) => {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new AppError("Google Places API key is missing", 500);
    }

    if (!latitude || !longitude) {
      throw new AppError("Latitude and Longitude are required", 401);
    }

    let url;

    if (query) {
      url = `${GOOGLE_PLACES_TEXT_SEARCH_URL}?key=${apiKey}&query=${encodeURIComponent(
        query
      )}&location=${latitude},${longitude}&radius=${radius}`;
      if (city) url += ` in ${encodeURIComponent(city)}`;
    } else {
      url = `${GOOGLE_PLACES_NEARBY_SEARCH_URL}?key=${apiKey}&location=${latitude},${longitude}&radius=${radius}`;
    }

    if (placeCategory) {
      url += `&type=${encodeURIComponent(placeCategory)}`;
    }

    const response = await axios.get(url);

    if (response.data.status !== "OK") {
      logger.error(`Google Places API error: ${response.data.status}`);
      return [];
    }

    return response.data.results.slice(0, size);
  } catch (error) {
    logger.error("Error fetching Google Places data:", error);
    throw new AppError("Failed to fetch places from Google Places API", 500);
  }
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
    return null;
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
  let event = null;

  // First, check if the event already exists in the database by its internal event ID
  if (eventId) {
    event = await prisma.event.findUnique({
      where: {
        id: eventId, // Use the provided eventId (real internal ID)
      },
    });
  }

  // If the event does not exist and eventData is provided, create the event with the provided id
  if (!event && eventData) {
    event = await prisma.event.create({
      data: {
        id: eventData.id, // Use the id from eventData as the real event ID
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
      },
    });
  }

  // Now, check if the attendance record already exists for the user and event
  const existingAttendance = await prisma.eventAttendance.findUnique({
    where: {
      eventId_userId: {
        eventId: eventId || event.id, // Use the internal eventId or created event ID
        userId: userId,
      },
    },
  });

  // Prepare update data - only include fields that were provided
  const updateData = {};
  if (isLiked !== undefined) updateData.isLiked = isLiked;
  if (isGoing !== undefined) updateData.isGoing = isGoing;

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
        eventId: eventId || event.id, // Use internal eventId
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
      source: "uni",
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

exports.filterEventsByUserPreferences = async (userPreferences, events) => {
  if (!events || events.length === 0) {
    return [];
  }

  // Calculate relevance score for each event based on user preferences
  const scoredEvents = events.map((event) => {
    let score = 0;
    const matchedPreferences = [];

    // Check if event has preferences
    if (!event.preferences) {
      return { event, score: 0, matchedPreferences };
    }

    // Match interests categories
    if (userPreferences.interests && event.preferences.interests) {
      Object.keys(userPreferences.interests).forEach((category) => {
        const userInterests = Array.isArray(userPreferences.interests[category])
          ? userPreferences.interests[category]
          : [];

        if (!Array.isArray(userInterests)) {
          console.error("Expected an array but got:", userInterests);
          userInterests = []; // or convert it properly
        }

        if (userInterests && userInterests.length > 0) {
          // Check if the event has matching interests in this category
          const eventInterests = event.preferences.interests[category] || [];

          userInterests?.forEach((interest) => {
            if (eventInterests.includes(interest)) {
              score += 2; // Higher weight for direct interest match
              matchedPreferences.push(`${category}: ${interest}`);
            }
          });
        }
      });
    }

    // Match music genre
    if (
      userPreferences.musicGenre &&
      event.preferences.musicGenre &&
      event.preferences.musicGenre === userPreferences.musicGenre
    ) {
      score += 3;
      matchedPreferences.push(`Music: ${userPreferences.musicGenre}`);
    }

    // Match college
    if (
      userPreferences.college &&
      event.preferences.college &&
      event.preferences.college === userPreferences.college
    ) {
      score += 3;
      matchedPreferences.push(`College: ${userPreferences.college}`);
    }

    // Match college clubs
    if (
      userPreferences.collegeClubs &&
      userPreferences.collegeClubs.length > 0 &&
      event.preferences.collegeClubs
    ) {
      const matchingClubs = userPreferences.collegeClubs.filter((club) =>
        event.preferences.collegeClubs.includes(club)
      );

      if (matchingClubs.length > 0) {
        score += matchingClubs.length;
        matchedPreferences.push(`Clubs: ${matchingClubs.join(", ")}`);
      }
    }

    // Match favorite artists
    if (
      userPreferences.favoriteArtists &&
      userPreferences.favoriteArtists.length > 0 &&
      event.preferences.favoriteArtists
    ) {
      const matchingArtists = userPreferences.favoriteArtists.filter((artist) =>
        event.preferences.favoriteArtists.includes(artist)
      );

      if (matchingArtists.length > 0) {
        score += matchingArtists.length * 2; // Higher weight for artist matches
        matchedPreferences.push(`Artists: ${matchingArtists.join(", ")}`);
      }
    }

    // Match favorite sports teams
    if (
      userPreferences.favoriteSportsTeams &&
      userPreferences.favoriteSportsTeams.length > 0 &&
      event.preferences.favoriteSportsTeams
    ) {
      const matchingTeams = userPreferences.favoriteSportsTeams.filter((team) =>
        event.preferences.favoriteSportsTeams.includes(team)
      );

      if (matchingTeams.length > 0) {
        score += matchingTeams.length * 2;
        matchedPreferences.push(`Teams: ${matchingTeams.join(", ")}`);
      }
    }

    // Major might be relevant for academic events
    if (
      userPreferences.major &&
      event.preferences.major &&
      event.preferences.major === userPreferences.major
    ) {
      score += 2;
      matchedPreferences.push(`Major: ${userPreferences.major}`);
    }

    // Return the event with its calculated relevance score
    return {
      event,
      score,
      matchedPreferences,
    };
  });

  // Divide events into those with scores > 0 and those with scores = 0
  const relevantEvents = [];
  const irrelevantEvents = [];

  scoredEvents.forEach((item) => {
    if (item.score > 0) {
      relevantEvents.push({
        ...item.event,
        relevanceScore: item.score,
        matchedPreferences: item.matchedPreferences,
      });
    } else {
      irrelevantEvents.push({
        ...item.event,
        relevanceScore: 0,
        matchedPreferences: [],
      });
    }
  });

  // Sort relevant events by score (highest first)
  relevantEvents.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Return relevant events first, followed by irrelevant events
  // This preserves the total number of events for pagination
  return [...relevantEvents, ...irrelevantEvents];
};

exports.getEventAttendance = async (eventId, currentUser) => {
  if (!eventId) throw new Error("Event ID is required");

  // Fetch all attendees who are going to the event
  const attendance = await prisma.eventAttendance.findMany({
    where: {
      eventId,
      isGoing: true,
      user: {
        isProfilePublic: true,
      },
    },
    include: {
      user: true,
    },
  });

  // Get current user's preferences directly from the user object
  const currentUserPrefs = currentUser.preferences;

  const attendeesWithMatches = attendance.map((a) => {
    const attendeeData = {
      userId: a.userId,
      name: `${a.user.firstName} ${a.user.lastName}`,
      profileImage: a.user.profileImage,
    };

    // Skip calculating match for the current user with themselves
    if (a.userId === currentUser.id) {
      return attendeeData;
    }

    // Calculate match percentage if both users have preferences
    if (currentUserPrefs && a.user.preferences) {
      const matchPercentage = calculateMatchPercentage(
        currentUserPrefs,
        a.user.preferences
      );
      return {
        ...attendeeData,
        matchPercentage,
      };
    }
    return attendeeData;
  });

  return {
    totalAttendees: attendance.length,
    attendees: attendeesWithMatches,
  };
};

exports.getUserEventInteraction = async (eventId, userId) => {
  try {
    const interaction = await prisma.eventAttendance.findFirst({
      where: {
        eventId: eventId,
        userId: userId,
      },
    });

    return interaction;
  } catch (error) {
    logger.error(`Error getting user interaction: ${error.message}`);
    throw new AppError("Failed to retrieve user interaction", 500);
  }
};

exports.getEventById = async (eventId) => {
  try {
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    return event;
  } catch (error) {
    logger.error(`Error getting event by ID: ${error.message}`);
    throw new AppError("Failed to retrieve event", 500);
  }
};
