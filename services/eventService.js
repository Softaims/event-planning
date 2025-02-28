const axios = require("axios");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const stopword = require("stopword");
const { prisma } = require("../db");
const { v4: uuidv4 } = require("uuid");
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
        const userInterests = userPreferences.interests[category];

        if (userInterests && userInterests.length > 0) {
          // Check if the event has matching interests in this category
          const eventInterests = event.preferences.interests[category] || [];

          userInterests.forEach((interest) => {
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

const calculateMatchPercentage = (currentUserPrefs, otherUserPrefs) => {
  let totalScore = 0;
  let maxPossibleScore = 0;

  // Weights for different categories (adjust as needed)
  const weights = {
    major: 15,
    college: 20,
    interests: 25,
    musicGenre: 10,
    zodiacSign: 5,
    collegeClubs: 10,
    favoriteShows: 5,
    favoriteArtists: 5,
    favoritePlacesToGo: 5,
    relationshipStatus: 0, // Not using for matching
    favoriteSportsTeams: 5,
  };

  // Calculate major match
  if (
    currentUserPrefs.major &&
    otherUserPrefs.major &&
    currentUserPrefs.major.toLowerCase() === otherUserPrefs.major.toLowerCase()
  ) {
    totalScore += weights.major;
  }
  maxPossibleScore += weights.major;

  // Calculate college match
  if (
    currentUserPrefs.college &&
    otherUserPrefs.college &&
    currentUserPrefs.college.toLowerCase() ===
      otherUserPrefs.college.toLowerCase()
  ) {
    totalScore += weights.college;
  }
  maxPossibleScore += weights.college;

  // Calculate interests match (considering the 3 category limit)
  if (currentUserPrefs.interests && otherUserPrefs.interests) {
    // Get categories that have items for current user
    const currentUserCategories = [];
    for (const category in currentUserPrefs.interests) {
      if (
        Array.isArray(currentUserPrefs.interests[category]) &&
        currentUserPrefs.interests[category].length > 0
      ) {
        currentUserCategories.push(category);
      }
    }

    // Get categories that have items for other user
    const otherUserCategories = [];
    for (const category in otherUserPrefs.interests) {
      if (
        Array.isArray(otherUserPrefs.interests[category]) &&
        otherUserPrefs.interests[category].length > 0
      ) {
        otherUserCategories.push(category);
      }
    }

    // Calculate overlap between categories
    const commonCategories = currentUserCategories.filter((cat) =>
      otherUserCategories.includes(cat)
    );
    const categoryMatchScore =
      (commonCategories.length /
        Math.max(1, Math.min(3, currentUserCategories.length))) *
      (weights.interests * 0.4);
    totalScore += categoryMatchScore;

    // Calculate specific interest matches within common categories
    let interestMatchScore = 0;
    for (const category of commonCategories) {
      const currentUserInterests = currentUserPrefs.interests[category] || [];
      const otherUserInterests = otherUserPrefs.interests[category] || [];

      const commonInterests = currentUserInterests.filter((interest) =>
        otherUserInterests.some(
          (i) => i.toLowerCase() === interest.toLowerCase()
        )
      );

      if (currentUserInterests.length > 0 && otherUserInterests.length > 0) {
        const categoryScore =
          (commonInterests.length /
            Math.max(
              1,
              Math.min(currentUserInterests.length, otherUserInterests.length)
            )) *
          ((weights.interests * 0.6) / Math.max(1, commonCategories.length));
        interestMatchScore += categoryScore;
      }
    }

    totalScore += interestMatchScore;
  }
  maxPossibleScore += weights.interests;

  // Calculate music genre match
  if (
    currentUserPrefs.musicGenre &&
    otherUserPrefs.musicGenre &&
    currentUserPrefs.musicGenre.toLowerCase() ===
      otherUserPrefs.musicGenre.toLowerCase()
  ) {
    totalScore += weights.musicGenre;
  }
  maxPossibleScore += weights.musicGenre;

  // Calculate zodiac sign match
  if (
    currentUserPrefs.zodiacSign &&
    otherUserPrefs.zodiacSign &&
    currentUserPrefs.zodiacSign.toLowerCase() ===
      otherUserPrefs.zodiacSign.toLowerCase()
  ) {
    totalScore += weights.zodiacSign;
  }
  maxPossibleScore += weights.zodiacSign;

  // Calculate college clubs match
  if (
    currentUserPrefs.collegeClubs &&
    otherUserPrefs.collegeClubs &&
    currentUserPrefs.collegeClubs.length > 0 &&
    otherUserPrefs.collegeClubs.length > 0
  ) {
    const commonClubs = currentUserPrefs.collegeClubs.filter((club) =>
      otherUserPrefs.collegeClubs.some(
        (c) => c.toLowerCase() === club.toLowerCase()
      )
    );

    const clubMatchScore =
      (commonClubs.length /
        Math.max(
          1,
          Math.min(
            currentUserPrefs.collegeClubs.length,
            otherUserPrefs.collegeClubs.length
          )
        )) *
      weights.collegeClubs;
    totalScore += clubMatchScore;
  }
  maxPossibleScore += weights.collegeClubs;

  // Calculate favorite shows match
  if (
    currentUserPrefs.favoriteShows &&
    otherUserPrefs.favoriteShows &&
    currentUserPrefs.favoriteShows.length > 0 &&
    otherUserPrefs.favoriteShows.length > 0
  ) {
    const commonShows = currentUserPrefs.favoriteShows.filter((show) =>
      otherUserPrefs.favoriteShows.some(
        (s) => s.toLowerCase() === show.toLowerCase()
      )
    );

    const showMatchScore =
      (commonShows.length /
        Math.max(
          1,
          Math.min(
            currentUserPrefs.favoriteShows.length,
            otherUserPrefs.favoriteShows.length
          )
        )) *
      weights.favoriteShows;
    totalScore += showMatchScore;
  }
  maxPossibleScore += weights.favoriteShows;

  // Calculate favorite artists match
  if (
    currentUserPrefs.favoriteArtists &&
    otherUserPrefs.favoriteArtists &&
    currentUserPrefs.favoriteArtists.length > 0 &&
    otherUserPrefs.favoriteArtists.length > 0
  ) {
    const commonArtists = currentUserPrefs.favoriteArtists.filter((artist) =>
      otherUserPrefs.favoriteArtists.some(
        (a) => a.toLowerCase() === artist.toLowerCase()
      )
    );

    const artistMatchScore =
      (commonArtists.length /
        Math.max(
          1,
          Math.min(
            currentUserPrefs.favoriteArtists.length,
            otherUserPrefs.favoriteArtists.length
          )
        )) *
      weights.favoriteArtists;
    totalScore += artistMatchScore;
  }
  maxPossibleScore += weights.favoriteArtists;

  // Calculate favorite places match
  if (
    currentUserPrefs.favoritePlacesToGo &&
    otherUserPrefs.favoritePlacesToGo &&
    currentUserPrefs.favoritePlacesToGo.length > 0 &&
    otherUserPrefs.favoritePlacesToGo.length > 0
  ) {
    const commonPlaces = currentUserPrefs.favoritePlacesToGo.filter((place) =>
      otherUserPrefs.favoritePlacesToGo.some(
        (p) => p.toLowerCase() === place.toLowerCase()
      )
    );

    const placeMatchScore =
      (commonPlaces.length /
        Math.max(
          1,
          Math.min(
            currentUserPrefs.favoritePlacesToGo.length,
            otherUserPrefs.favoritePlacesToGo.length
          )
        )) *
      weights.favoritePlacesToGo;
    totalScore += placeMatchScore;
  }
  maxPossibleScore += weights.favoritePlacesToGo;

  // Calculate favorite sports teams match
  if (
    currentUserPrefs.favoriteSportsTeams &&
    otherUserPrefs.favoriteSportsTeams &&
    currentUserPrefs.favoriteSportsTeams.length > 0 &&
    otherUserPrefs.favoriteSportsTeams.length > 0
  ) {
    const commonTeams = currentUserPrefs.favoriteSportsTeams.filter((team) =>
      otherUserPrefs.favoriteSportsTeams.some(
        (t) => t.toLowerCase() === team.toLowerCase()
      )
    );

    const teamMatchScore =
      (commonTeams.length /
        Math.max(
          1,
          Math.min(
            currentUserPrefs.favoriteSportsTeams.length,
            otherUserPrefs.favoriteSportsTeams.length
          )
        )) *
      weights.favoriteSportsTeams;
    totalScore += teamMatchScore;
  }
  maxPossibleScore += weights.favoriteSportsTeams;

  // Calculate final percentage
  return Math.round((totalScore / maxPossibleScore) * 100);
};


exports.getEventAttendance = async (eventId, currentUser) => {
  if (!eventId) throw new Error("Event ID is required");

  // Fetch all attendees who are going to the event
  const attendance = await prisma.eventAttendance.findMany({
    where: {
      eventId,
      isGoing: true,
    },
    include: {
      user: true, // This should include preferences if they're already available on the user object
    },
  });

  // Get current user's preferences directly from the user object
  const currentUserPrefs = currentUser.preferences;

  // If current user has no preferences, we'll still show attendees but without match percentages
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

    // Return attendee data without match percentage if preferences are missing
    return attendeeData;
  });

  return {
    totalAttendees: attendance.length,
    attendees: attendeesWithMatches,
  };
};

