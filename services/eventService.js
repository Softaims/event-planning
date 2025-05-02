const axios = require("axios");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const stopword = require("stopword");
const { prisma } = require("../db");
const { v4: uuidv4 } = require("uuid");
const {notifyPopularEvent} = require("./eventNotifications");
const {popularByPreferences} = require("./eventNotifications");
const extractFilters=require("./../utils/chatGPT")


const keywordExtractor = require("keyword-extractor");

const extractMainKeywords = (query) => {
  if (!query || typeof query !== "string") return "";

  const extractionResult = keywordExtractor.extract(query, {
    language: "english",
    remove_digits: true,
    return_changed_case: true,
    remove_duplicates: true,
  });

  return extractionResult.join(" ");
};



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

// exports.fetchTicketmasterEvents = async ({
//   query,
//   city,
//   latitude,
//   longitude,
//   eventCategory,
//   size,
//   page,
//   radius,
// }) => {
//   try {
//     // const filteredQuery = filterQuery(query);
//     const formattedEventCategory = formatMultipleParams(eventCategory);

//     const response = await axios.get(TICKET_MASTER_URL, {
//       params: {
//         apikey: process.env.TICKETMASTER_API_KEY,
//         city,
//         classificationName: formattedEventCategory,
//         latlong: latitude && longitude ? `${latitude},${longitude}` : "",
//         radius,
//         size,
//         page,
//       },
//     });

//     return response.data._embedded?.events || [];
//   } catch (error) {
//     logger.error("Error fetching Ticketmaster events:", error);
//     throw new AppError("Failed to fetch events from Ticketmaster", 500);
//   }
// };

// exports.fetchGooglePlaces = async ({
//   query,
//   latitude,
//   longitude,
//   placeCategory,
//   city,
//   radius = 5000,
//   size = 10,
// }) => {
//   try {
//     const apiKey = process.env.GOOGLE_PLACES_API_KEY;
//     if (!apiKey) {
//       throw new AppError("Google Places API key is missing", 500);
//     }

//     if (!latitude || !longitude) {
//       throw new AppError("Latitude and Longitude are required", 401);
//     }

//     let url;

//     if (query) {
//       url = `${GOOGLE_PLACES_TEXT_SEARCH_URL}?key=${apiKey}&query=${encodeURIComponent(
//         query
//       )}&location=${latitude},${longitude}&radius=${radius}`;
//       if (city) url += ` in ${encodeURIComponent(city)}`;
//     } else {
//       url = `${GOOGLE_PLACES_NEARBY_SEARCH_URL}?key=${apiKey}&location=${latitude},${longitude}&radius=${radius}`;
//     }

//     if (placeCategory) {
//       url += `&type=${encodeURIComponent(placeCategory)}`;
//     }

//     const response = await axios.get(url);

//     if (response.data.status !== "OK") {
//       logger.error(`Google Places API error: ${response.data.status}`);
//       return [];
//     }

//     return response.data.results.slice(0, size);
//   } catch (error) {
//     logger.error("Error fetching Google Places data:", error);
//     throw new AppError("Failed to fetch places from Google Places API", 500);
//   }
// };


// ------------- my old function till 21 april 



// exports.fetchTicketmasterEvents = async ({
//   query,
//   city,
//   latitude,
//   longitude,
//   eventCategory,
//   radius = 200,
// }) => {
//   try {
//     const formattedEventCategory = formatMultipleParams(eventCategory);
//     const latlong = latitude && longitude ? `${latitude},${longitude}` : "";

//     const params = {
//       apikey: process.env.TICKETMASTER_API_KEY,
//       ...(latlong && { latlong }),
//       ...(formattedEventCategory && formattedEventCategory !== "*" && {
//         classificationName: formattedEventCategory,
//       }),
//       locale: "*",
//       radius,
//       size: 200,
//     };

//     console.log("🔍 Ticketmaster API Request Params:", params);

//     const response = await axios.get(TICKET_MASTER_URL, { params });
//     const events = response.data._embedded?.events || [];

//     const now = new Date();
//     const futureEvents = events.filter(
//       (event) => new Date(event.dates?.start?.dateTime) > now
//     );

//     console.log(`✅ Fetched ${futureEvents.length} future events`);
//     return futureEvents;
//   } catch (error) {
//     logger.error("Error fetching Ticketmaster events:", error);
//     throw new AppError("Failed to fetch events from Ticketmaster", 500);
//   }
// };


// ------------- my old function till 21 april 


// ------------- my new function from 21 april 


const categoryConfig = {
  Festival: { classificationId: "KZFzniwnSyZfZ7v7n1", genreId: "KnvZfZ7vAeE" },
  Food: { classificationId: "KZFzniwnSyZfZ7v7n1", genreId: "KnvZfZ7vAAI" },
  "Health & Wellness": { classificationId: "KZFzniwnSyZfZ7v7n1", genreId: "KnvZfZ7vAAl" },
  Seminar: { classificationId: "KZFzniwnSyZfZ7v7n1", genreId: "KnvZfZ7vAJe" },
  "Club": { classificationId: "KZFzniwnSyZfZ7v7n1", genreId: "KnvZfZ7vAAa" },
  "Music/Concert": { classificationId: "KZFzniwnSyZfZ7v7nJ" },
  Sport: { classificationId: "KZFzniwnSyZfZ7v7nE" },
  "Arts & Theatre": { classificationId: "KZFzniwnSyZfZ7v7na" },
  Film: { classificationId: "KZFzniwnSyZfZ7v7nn" },
  Other: { classificationId: "KZFzniwnSyZfZ7v7n1" },
};

// exports.fetchTicketmasterEvents = async ({
//   query,
//   city,
//   latitude,
//   longitude,
//   eventCategory,
//   radius = 200,
// }) => {
//   try {
//     const latlong = latitude && longitude ? `${latitude},${longitude}` : "";

//     const category = eventCategory || "Other";
//     const categoryData = categoryConfig[category] || categoryConfig["Other"];

//     const params = {
//       apikey: process.env.TICKETMASTER_API_KEY,
//       locale: "*",
//       size: 200,
//       radius,
//       ...(latlong && { latlong }),
//       ...(categoryData.classificationId && { classificationId: categoryData.classificationId }),
//       ...(categoryData.genreId && { genreId: categoryData.genreId }),
//       ...(query && { keyword: query }),
//     };

//     console.log("🎫 Ticketmaster API Params:", params);

//     const response = await axios.get(TICKET_MASTER_URL, { params });
//     const events = response.data._embedded?.events || [];

//     const now = new Date();

//     const filteredEvents = events.filter((event) => {
//       const date = new Date(event.dates?.start?.dateTime);
//       const venueCity = event._embedded?.venues?.[0]?.city?.name?.toLowerCase() || "";
//       return date > now && (!city || venueCity.includes(city.toLowerCase()));
//     });

//     console.log(`✅ Fetched ${filteredEvents.length} events from Ticketmaster`);
//     return filteredEvents;
//   } catch (error) {
//     logger.error("❌ Error fetching Ticketmaster events:", error);
//     throw new AppError("Failed to fetch events from Ticketmaster", 500);
//   }
// };

exports.fetchTicketmasterEvents = async ({
  query,
  city,
  latitude,
  longitude,
  eventCategory,
  radius = 200,
}) => {
  try {
    const filteredQuery = filterQuery(query); // <-- change here

    const latlong = latitude && longitude ? `${latitude},${longitude}` : "";

    const categoryData = eventCategory ? categoryConfig[eventCategory] : null;

    const params = {
      apikey: process.env.TICKETMASTER_API_KEY,
      locale: "*",
      size: 200,
      radius,
      ...(latlong && { latlong }),
      // ...(query && { keyword: query }),
      ...(filteredQuery && { keyword: filteredQuery }), // <-- use filteredQuery
      ...(categoryData?.classificationId && { classificationId: categoryData.classificationId }),
      ...(categoryData?.genreId && { genreId: categoryData.genreId }),
    };

    console.log("🎫 Ticketmaster API Params:", params);

    const response = await axios.get(TICKET_MASTER_URL, { params });
    const events = response.data._embedded?.events || [];

    const now = new Date();

    const filteredEvents = events.filter((event) => {
      const date = new Date(event.dates?.start?.dateTime);
      const venueCity = event._embedded?.venues?.[0]?.city?.name?.toLowerCase() || "";
      return date > now && (!city || venueCity.includes(city.toLowerCase()));
    });

    console.log(`✅ Fetched ${filteredEvents.length} events from Ticketmaster`);
    return filteredEvents;
  } catch (error) {
    logger.error("❌ Error fetching Ticketmaster events:", error);
    throw new AppError("Failed to fetch events from Ticketmaster", 500);
  }
};


// ------------- my new function from 21 april 

// exports.fetchGooglePlaces = async ({
//   query,
//   latitude,
//   longitude,
//   placeCategory,
//   city,
//   radius,
//   size = 200,
// }) => {
//   try {
//     console.log(radius, 'radiu')
//     const apiKey = process.env.GOOGLE_PLACES_API_KEY;
//     if (!apiKey) {
//       throw new AppError("Google Places API key is missing", 500);
//     }

//     if (!latitude || !longitude) {
//       throw new AppError("Latitude and Longitude are required", 401);
//     }

//     let url;

//     // if (query) {
//     //   url = `${GOOGLE_PLACES_TEXT_SEARCH_URL}?key=${apiKey}&query=${encodeURIComponent(
//     //     query
//     //   )}&location=${latitude},${longitude}&radius=${radius}`;
//     //   console.log(url,'rul')
//     //   if (city) url += ` in ${encodeURIComponent(city)}`;
//     // } else {
//     //   url = `${GOOGLE_PLACES_NEARBY_SEARCH_URL}?key=${apiKey}&location=${latitude},${longitude}&radius=${radius}`;
//     //   console.log(url,'rul')

//     // }

//     // if (placeCategory) {
//     //   url += `&type=${encodeURIComponent(placeCategory)}`;
//     // }

//     if (query) {
//       let fullQuery = query;
//       if (placeCategory) fullQuery += ` ${placeCategory}`;
//       if (city) fullQuery += ` in ${city}`;
    
//       url = `${GOOGLE_PLACES_TEXT_SEARCH_URL}?key=${apiKey}&query=${encodeURIComponent(
//         fullQuery
//       )}&location=${latitude},${longitude}&radius=${radius}`;
//     } else {
//       url = `${GOOGLE_PLACES_NEARBY_SEARCH_URL}?key=${apiKey}&location=${latitude},${longitude}&radius=${radius}`;
//       if (placeCategory) {
//         url += `&type=${encodeURIComponent(placeCategory)}`;
//       }
//     }
    
//     console.log(url, 'finalurl')

//     const response = await axios.get(url);

//     if (response.data.status !== "OK") {
//       logger.error("Google Places API error response:", response.data);
//       return [];
//     }

//     return response.data.results.slice(0, size);
//   } catch (error) {
//     logger.error("Error fetching Google Places data:", error);
//     throw new AppError("Failed to fetch places from Google Places API", 500);
//   }
// };


// ------------- my new function from 02 May 2025.

exports.fetchGooglePlaces = async ({
  query,
  latitude,
  longitude,
  placeCategory,
  city,
  radius,
  size = 200,
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

    // Use Text Search if query or placeCategory is provided (more accurate for keywords)
    if (query || placeCategory) {
      const searchQuery = query
        ? `${query}${city ? ` in ${city}` : ""}`
        : `${placeCategory}${city ? ` in ${city}` : ""}`;

      url = `${GOOGLE_PLACES_TEXT_SEARCH_URL}?key=${apiKey}&query=${encodeURIComponent(
        searchQuery
      )}&location=${latitude},${longitude}&radius=${radius}`;
    } else {
      // Fallback to Nearby Search if no query or category
      url = `${GOOGLE_PLACES_NEARBY_SEARCH_URL}?key=${apiKey}&location=${latitude},${longitude}&radius=${radius}`;
    }
console.log(url, 'finalurl')
    const response = await axios.get(url);

    if (response.data.status !== "OK") {
      logger.error("Google Places API error response:", response.data);
      return [];
    }

    return response.data.results.slice(0, size);
  } catch (error) {
    logger.error("Error fetching Google Places data:", error);
    throw new AppError("Failed to fetch places from Google Places API", 500);
  }
};


// exports.getEventsFromDb = async () => {
//   return await prisma.event.findMany({
//     where: {
//       source: "UNI Featured",
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//   });
// };

exports.getEventsFromDb = async ({ query = "", latitude, longitude }) => {
  const filters = {
    source: "UNI Featured",
  };

  if (query) {
    filters.OR = [
      {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query,
          mode: "insensitive",
        },
      },
    ];
  }

  // If you store event.latitude and event.longitude, and want to filter within a certain radius:
  // You can add a proximity check here using raw SQL or PostGIS (but Prisma by itself doesn't support geospatial filtering directly).
  // For now, we'll just return all, and filter manually later if needed.

  return await prisma.event.findMany({
    where: filters,
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

exports.getEventDetails = async ({ externalId, userId }) => {

  console.log('cat ', externalId, userId);
  if (!externalId || !userId) {
    throw new Error("External ID and User ID are required");
  }

  // Fetch attendees by externalId instead of eventId
  const attendees = await prisma.eventAttendance.findMany({
    where: { externalId },
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


exports.getInteractionDetails = async ({ externalId, userId }) => {
  if (!externalId || !userId) {
    throw new Error("External ID and User ID are required");
  }

  const interaction = await prisma.eventAttendance.findFirst({
    where: {
      externalId,
      userId,
    },
  });

  if (!interaction) {
    return { isLiked: false, isGoing: false }; // return default interaction
  }

  // Only return required fields
  return {
    isLiked: interaction.isLiked,
    isGoing: interaction.isGoing,
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
  eventId,  // This is the externalId from the frontend
  isLiked,
  isGoing,
  isShare,
  eventData,
}) => {
  let event = null;

  console.log('event id is ', eventId);
  
  if (eventId) {
    event = await prisma.event.findUnique({ where: { externalId: eventId } });
  }

  if (!event && eventData) {
    event = await prisma.event.create({
      data: {
        id: uuidv4(), // Generate our internal event ID
        externalId: eventId, // Store the Ticketmaster event ID
        name: eventData.name,
        description: eventData.description || "",
        source: eventData.source,
        image: eventData.image || "",
        location: eventData.location || "",
        dateTime: eventData.dateTime ? new Date(eventData.dateTime) : new Date(),
        ageMin: eventData.ageMin || null,
        ageMax: eventData.ageMax || null,
        ticketUrls: eventData.ticketUrls || [],
        preferences: eventData.preferences || null,
        latitude: eventData.latitude || null,
        longitude : eventData.longitude || null
      },
    });
  }

  // Use the internal ID (event.id) for database operations
  const internalEventId = event.id;

  const existingAttendance = await prisma.eventAttendance.findUnique({
    where: { eventId_userId: { eventId: internalEventId, userId: userId } },
  });

  const updateData = {};
  if (isLiked !== undefined) updateData.isLiked = isLiked;
  if (isGoing !== undefined) updateData.isGoing = isGoing;
  if (isShare !== undefined) updateData.isShare = isGoing;

  let attendanceRecord;
  if (existingAttendance) {
    attendanceRecord = await prisma.eventAttendance.update({
      where: { id: existingAttendance.id },
      data: updateData,
    });
  } else {
    attendanceRecord = await prisma.eventAttendance.create({
      data: {
        id: uuidv4(),
        eventId: internalEventId,  
        externalId: eventId,
        userId: userId,
        isLiked: isLiked ?? false,
        isGoing: isGoing ?? false,
        isShare: isShare ?? false,

      },
    });
  }

  if (isGoing) {
    await notifyPopularEvent(eventId, event?.name);
  }
  if (isLiked) {
    await popularByPreferences(eventId, event?.name)
  } 
  if (isShare) {
    await popularByPreferences(eventId, event?.name)
  } 
  return attendanceRecord;
};


exports.getUserEvents = async (userId) => {
  // Fetch events created by the user
  const events = await prisma.event.findMany({
    where: {
      userId: userId,
      source: "UNI Featured",
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
  if (!eventId) {
    return {
      status: "error",
      message: "Event ID is required",
      data: null,
    };
  }

  // Find the event using the externalId
  const event = await prisma.event.findUnique({
    where: { externalId: eventId },
    select: { id: true }, // Only fetch the actual event ID
  });

  if (!event) {
    return {
      status: "success",
      message: "Event not found",
      data: {
        totalAttendees: 0,
        attendees: [],
      },
    };
  }

  // Fetch all attendees who are going to the event
  const attendance = await prisma.eventAttendance.findMany({
    where: {
      eventId: event.id, // Use the actual event ID
      isGoing: true,
      user: {
        isProfilePublic: true,
      },
    },
    include: {
      user: true,
    },
  });

  // Get current user's preferences
  const currentUserPrefs = currentUser.preferences;

  const attendeesWithMatches = attendance.map((a) => {
    const attendeeData = {
      userId: a.userId,
      name: `${a.user.firstName} ${a.user.lastName}`,
      profileImage: a.user.profileImage,
    };

    // Skip match calculation for the current user
    if (a.userId === currentUser.id) {
      return attendeeData;
    }

    // Calculate match percentage
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
    status: "success",
    message: "Attendance fetched successfully.",
    data: {
      totalAttendees: attendance.length,
      attendees: attendeesWithMatches,
    },
  };
};


exports.searchEventAttendance = async (query, eventId, currentUser) => {
  if (!query) {
    throw new Error("Query parameter 'q' is required");
  }

  if (!eventId) {
    throw new Error("Event ID is required");
  }

  // Extract structured filters from OpenAI
  const filters = await extractFilters(query);
  console.log("filters:", filters);

  if (!filters || Object.keys(filters).length === 0) {
    throw new Error("No filters extracted from query");
  }

  // Build Prisma `where` conditions for filtering users
  let whereConditions = [];

  Object.entries(filters).forEach(([key, value]) => {
    // Handle nested paths (e.g., interests.foodDrink)
    const pathParts = key.split('.');
    
    if (value && value.$ne) {
      // Handle negative filters (do not like)
      if (Array.isArray(value.$ne)) {
        // For array values, create a condition that excludes users with any of these values
        value.$ne.forEach(excludeValue => {
          whereConditions.push({
            NOT: {
              user: {
                preferences: {
                  path: pathParts,
                  array_contains: [excludeValue],
                }
              }
            }
          });
        });
      } else {
        // For single values, exclude direct matches
        whereConditions.push({
          NOT: {
            user: {
              preferences: {
                path: pathParts,
                equals: value.$ne,
              }
            }
          }
        });
      }
    } else if (Array.isArray(value)) {
      // For positive array filters (likes any of these)
      // Create an OR condition for each value in the array
      const orConditions = value.map(v => ({
        user: {
          preferences: {
            path: pathParts,
            array_contains: [v],
          }
        }
      }));
      
      if (orConditions.length > 0) {
        whereConditions.push({
          OR: orConditions
        });
      }
    } else {
      // Direct match for single values
      whereConditions.push({
        user: {
          preferences: {
            path: pathParts,
            equals: value,
          }
        }
      });
    }
  });

  // Fetch all attendees who are going to the event
  const attendance = await prisma.eventAttendance.findMany({
    where: {
      externalId: eventId,
      isGoing: true,
      user: {
        isProfilePublic: true,
      },
      AND: whereConditions, // Apply structured filters
    },
    include: {
      user: true,
    },
  });

  // Get current user's preferences
  const currentUserPrefs = currentUser?.preferences;

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
      const matchPercentage = calculateMatchPercentage(currentUserPrefs, a.user.preferences);
      return {
        ...attendeeData,
        matchPercentage,
      };
    }

    return attendeeData;
  });

  return {
    totalAttendees: attendeesWithMatches.length,
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
