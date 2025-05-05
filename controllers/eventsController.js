const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const {extractSearchIntent} = require("../utils/chatGPT");
const { prisma } = require("../db");
const { eventDto } = require("../dtos/eventDto");
const { placeDto } = require("../dtos/placeDto");
const { dbEventDto } = require("../dtos/dbEventDto");
const eventService = require("../services/eventService");
const authService = require("../services/authService");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const stringSimilarity = require("string-similarity");
const fs = require("fs");
const s3Service = require("../utils/s3Service");

// exports.getEvents = catchAsync(async (req, res, next) => {
//   let {
//     query,
//     placeCategory,
//     city = "",
//     eventCategory = "",
//     size = 10,
//     page = 0,
//     latitude,
//     longitude,
//     radius,
//   } = req.query;

//   size = parseInt(size, 10);
//   page = parseInt(page, 10);

//   if (isNaN(page) || page < 1) page = 1;
//   if (isNaN(size) || size < 1) size = 10;

//   const userId = req.user.id;
//   const userData = await authService.findUserById(userId);

//   if (!latitude || !longitude) {
//     latitude = userData?.lat;
//     longitude = userData?.long;
//   }

//   console.log(req.query, 'query ------------------------>>>>>>>>>>>>data')
//   // Calculate sizes for each source
//   const perSourceSize = Math.floor(size / 3);
//   const remainingSize = size % 3;

//   const [events, places, eventsFromDb] = await Promise.all([
//     eventService.fetchTicketmasterEvents({
//       query,
//       city,
//       eventCategory,
//       size: perSourceSize + (remainingSize > 0 ? 1 : 0),
//       page,
//       latitude,
//       longitude,
//       radius,
//     }),
//     eventService.fetchGooglePlaces({
//       query,
//       placeCategory,
//       city,
//       page,
//       latitude,
//       longitude,
//       radius,
//       size: perSourceSize + (remainingSize > 1 ? 1 : 0),
//     }),
//     eventService.getEventsFromDb(),
//   ]);

//   const latestFilteredEvents = eventsFromDb
//     .filter((event) => event.createdAt)
//     .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
//     .slice(0, perSourceSize);

//   let mergedResults = [
//     ...events.map((event) => ({ ...eventDto(event) })),
//     ...latestFilteredEvents.map((event) => ({ ...dbEventDto(event) })),
//     ...places.map((place) => ({ ...placeDto(place) })),
//   ];

//   // Filter out objects with null location, image, or dateTime
//   // mergedResults = mergedResults.filter(
//   //   (event) => event.location && event.image && event.dateTime
//   // );


    
//   // Fetch interaction data for each event
//   const finalResults = await Promise.all(
//     mergedResults.map(async (event) => {
//       try {
//         const attendanceData = await eventService.getInteractionDetails({
//           externalId: event.id,
//           userId: userData.id,
//         });
  
//         return {
//           ...event,
//           interaction: attendanceData || { isLiked: false, isGoing: false },
//         };
//       } catch (err) {
//         // fallback if interaction not found or error happens
//         return {
//           ...event,
//           interaction: { isLiked: false, isGoing: false },
//         };
//       }
//     })
//   );
  

//   // Sort and limit to exact size
//   // finalResults.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

//   finalResults.sort((a, b) => {
//     if (!a.dateTime) return 1;  // push a to the end
//     if (!b.dateTime) return -1; // push b to the end
//     return new Date(a.dateTime) - new Date(b.dateTime);
//   });
  
//   const paginatedResults = finalResults.slice(0, size);

//   console.log(paginatedResults, "filtered results");

//   res.status(200).json({
//     status: "success",
//     message: "Events and places fetched successfully.",
//     data: {
//       page,
//       total: paginatedResults.length,
//       results: paginatedResults,
//     },
//   });
// });


// ------------------------my working code till 21 april 2025-----------------------------//


// exports.getEvents = catchAsync(async (req, res, next) => {
//   let {
//     query,
//     placeCategory,
//     city = "",
//     eventCategory = "",
//     latitude,
//     longitude,
//     radius = 200, // ✅ Default radius
//   } = req.query;

//   const userId = req.user.id;
//   const userData = await authService.findUserById(userId);

//   if (!latitude || !longitude) {
//     latitude = userData?.lat;
//     longitude = userData?.long;
//   }

//   console.log(req.query, "query ------------------------>>>>>>>>>>>>data");

//   const [events, places, eventsFromDb] = await Promise.all([
//     eventService.fetchTicketmasterEvents({
//       query,
//       city,
//       eventCategory,
//       latitude,
//       longitude,
//       radius,
//     }),
//     eventService.fetchGooglePlaces({
//       query,
//       placeCategory,
//       city,
//       latitude,
//       longitude,
//       radius,
//     }),
//     eventService.getEventsFromDb(),
//   ]);

//   const now = new Date();

//   const latestFilteredEvents = eventsFromDb
//     .filter((event) => new Date(event.dateTime) > now) // ✅ Only future events
//     .map((event) => ({ ...dbEventDto(event) }));

//   const ticketmasterEvents = events
//     .filter((event) => new Date(event.dates?.start?.dateTime) > now)
//     .map((event) => ({ ...eventDto(event) }));

//   const googlePlaces = places.map((place) => ({ ...placeDto(place) }));

//   // ✅ Merge all results
//   let mergedResults = [...ticketmasterEvents, ...latestFilteredEvents, ...googlePlaces];

//   // ✅ Add distance from user
//   mergedResults = mergedResults.map((item) => {
//     if (item.latitude && item.longitude) {
//       const distance = getDistanceFromLatLonInKm(latitude, longitude, item.latitude, item.longitude);
//       return { ...item, distance };
//     }
//     return { ...item, distance: Number.MAX_SAFE_INTEGER };
//   });

//   // ✅ Add interaction data
//   const finalResults = await Promise.all(
//     mergedResults.map(async (event) => {
//       try {
//         const attendanceData = await eventService.getInteractionDetails({
//           externalId: event.id,
//           userId: userData.id,
//         });

//         return {
//           ...event,
//           interaction: attendanceData || { isLiked: false, isGoing: false },
//         };
//       } catch (err) {
//         return {
//           ...event,
//           interaction: { isLiked: false, isGoing: false },
//         };
//       }
//     })
//   );

//   // ✅ Sort by date first, then by proximity
//   finalResults.sort((a, b) => {
//     const dateA = a.dateTime ? new Date(a.dateTime) : new Date(8640000000000000);
//     const dateB = b.dateTime ? new Date(b.dateTime) : new Date(8640000000000000);
//     if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
//     return a.distance - b.distance;
//   });

//   res.status(200).json({
//     status: "success",
//     message: "Events and places fetched successfully.",
//     data: {
//       results: finalResults,
//     },
//   });
// });


// ------------------------my working code till 21 april 2025-----------------------------//


// ------------------------new working code from 21 april 2025-----------------------------//


const USE_STRING_MATCHING = true; // Enable fuzzy match for title variation


// with duplicate functionlity live on 21 april and it is working but commeneted on 22


exports.getEvents = catchAsync(async (req, res, next) => {
  let {
    query,
    placeCategory,
    city = "",
    eventCategory,
    latitude,
    longitude,
    radius = 75,
  } = req.query;

  const userId = req.user.id;
  const userData = await authService.findUserById(userId);


    const milesToMeters = (miles) => miles * 1609.34;
  console.log(milesToMeters, 'meters')

  if (!latitude || !longitude) {
    latitude = userData?.lat;
    longitude = userData?.long;
  }

  // Normalize values (treat empty string as undefined)
  // eventCategory = eventCategory?.trim() || undefined;
  // placeCategory = placeCategory?.trim() || undefined;

  console.log(eventCategory, placeCategory, 'category')
  // const shouldCallTicketmaster = !!eventCategory || (!eventCategory && !placeCategory);
  // const shouldCallGooglePlaces = !!placeCategory || (!eventCategory && !placeCategory);

 // Normalize null-like strings to undefined
eventCategory = eventCategory === "null" || eventCategory?.trim() === "" ? undefined : eventCategory;
placeCategory = placeCategory === "null" || placeCategory?.trim() === "" ? undefined : placeCategory;

// Handle the 4 cases as per requirement
const isEventCategoryMissing = !req.query.hasOwnProperty("eventCategory");
const isPlaceCategoryMissing = !req.query.hasOwnProperty("placeCategory");

const shouldCallTicketmaster = (eventCategory !== undefined) || (isEventCategoryMissing && isPlaceCategoryMissing);
const shouldCallGooglePlaces = (placeCategory !== undefined) || (isEventCategoryMissing && isPlaceCategoryMissing);



  console.log(shouldCallTicketmaster, shouldCallGooglePlaces, 'places')


  const [ticketmasterRaw, googlePlacesRaw, dbEventsRaw] = await Promise.all([
    shouldCallTicketmaster
      ? eventService.fetchTicketmasterEvents({
          query: query ? query : "",
          city,
          eventCategory,
          latitude,
          longitude,
          radius,
        })
      : Promise.resolve([]),

    shouldCallGooglePlaces
      ? eventService.fetchGooglePlaces({
          query:  query ? query : "",
          placeCategory,
          city,
          latitude,
          longitude,
          // radius,
          radius: milesToMeters(radius)
        })
      : Promise.resolve([]),

    // eventService.getEventsFromDb(),
    eventService.getEventsFromDb({
      query: query ? query.trim() : "",
      latitude,
      longitude,
    })
    
  ]);

  const now = new Date();

  const ticketmasterEvents = ticketmasterRaw
    .filter((e) => new Date(e.dates?.start?.dateTime) > now)
    .map((e) => eventDto(e));

  const googlePlaces = googlePlacesRaw.map((p) => placeDto(p));

  const dbEvents = dbEventsRaw
    .filter((e) => new Date(e.dateTime) > now)
    .map((e) => dbEventDto(e));

  let allEvents = [...ticketmasterEvents, ...googlePlaces, ...dbEvents];

  // Remove duplicates using composite key + optional string similarity
  const seenKeys = new Set();
  const dedupedEvents = [];

  for (let event of allEvents) {
    const dateKey = event.dateTime
      ? new Date(event.dateTime).toDateString()
      : "unknown";
    const locationKey = (event.location || "").toLowerCase().trim();
    const uniqueKey = `${event.id}_${dateKey}_${locationKey}`;

    const isDuplicate = seenKeys.has(uniqueKey);

    if (!isDuplicate) {
      if (USE_STRING_MATCHING) {
        const isSimilar = dedupedEvents.some((existing) => {
          const sameDate =
            (existing.dateTime &&
              event.dateTime &&
              new Date(existing.dateTime).toDateString() ===
                new Date(event.dateTime).toDateString()) ||
            false;

          const sameVenue =
            (existing.location || "").toLowerCase() === locationKey;

          const titleSimilarity = stringSimilarity.compareTwoStrings(
            existing.name || "",
            event.name || ""
          );

          return sameDate && sameVenue && titleSimilarity > 0.8;
        });

        if (!isSimilar) {
          seenKeys.add(uniqueKey);
          dedupedEvents.push(event);
        }
      } else {
        seenKeys.add(uniqueKey);
        dedupedEvents.push(event);
      }
    }
  }

  // Add distance info
  const enrichedEvents = dedupedEvents.map((event) => {
    const distance =
      event.latitude && event.longitude
        ? getDistanceFromLatLonInKm(
            parseFloat(latitude),
            parseFloat(longitude),
            event.latitude,
            event.longitude
          )
        : Number.MAX_SAFE_INTEGER;

    return { ...event, distance };
  });

  // Add interaction data
  const finalResults = await Promise.all(
    enrichedEvents.map(async (event) => {
      try {
        const interaction = await eventService.getInteractionDetails({
          externalId: event.id,
          userId: userData.id,
        });

        return {
          ...event,
          interaction: interaction || { isLiked: false, isGoing: false },
        };
      } catch (err) {
        return {
          ...event,
          interaction: { isLiked: false, isGoing: false },
        };
      }
    })
  );

  // Sort by date first, then distance
  finalResults.sort((a, b) => {
    const dateA = a.dateTime ? new Date(a.dateTime) : new Date(8640000000000000);
    const dateB = b.dateTime ? new Date(b.dateTime) : new Date(8640000000000000);
    if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
    return a.distance - b.distance;
  });

  res.status(200).json({
    status: "success",
    message: "Events and places fetched successfully.",
    data: {
      results: finalResults,
    },
  });
});

// with duplicate functionlity live on 21 april and it is working but commeneted on 22


// new api as on 22 april 2 PM
// exports.getEvents = catchAsync(async (req, res, next) => {
//   let {
//     query,
//     placeCategory = "",
//     city = "",
//     eventCategory = "",
//     latitude,
//     longitude,
//     radius = 75,
//     expandRadius = "false",
//   } = req.query;

//   const userId = req.user.id;
//   const userData = await authService.findUserById(userId);

//   if (!latitude || !longitude) {
//     latitude = userData?.lat;
//     longitude = userData?.long;
//   }

//   const expandedRadius = expandRadius === "true" ? 150 : radius;

//   const shouldCallTicketmaster = eventCategory.trim() !== "";
//   const shouldCallGooglePlaces = placeCategory.trim() !== "";
//   const callBothUnfiltered = !shouldCallTicketmaster && !shouldCallGooglePlaces;

//   const [ticketmasterRaw, googlePlacesRaw, dbEventsRaw] = await Promise.all([
//     (shouldCallTicketmaster || callBothUnfiltered)
//       ? eventService.fetchTicketmasterEvents({
//           query,
//           city,
//           eventCategory: shouldCallTicketmaster ? eventCategory : undefined,
//           latitude,
//           longitude,
//           radius: expandedRadius,
//         }) : [],
//     (shouldCallGooglePlaces || callBothUnfiltered)
//       ? eventService.fetchGooglePlaces({
//           query,
//           placeCategory: shouldCallGooglePlaces ? placeCategory : undefined,
//           city,
//           latitude,
//           longitude,
//           radius: expandedRadius,
//         }) : [],
//     eventService.getEventsFromDb(),
//   ]);

//   const now = new Date();

//   const ticketmasterEvents = ticketmasterRaw
//     .filter((e) => new Date(e.dates?.start?.dateTime) > now)
//     .map((e) => eventDto(e));

//   const googlePlaces = googlePlacesRaw.map((p) => placeDto(p));

//   const dbEvents = dbEventsRaw
//     .filter((e) => new Date(e.dateTime) > now)
//     .map((e) => dbEventDto(e));

//   let allEvents = [...ticketmasterEvents, ...googlePlaces, ...dbEvents];

//   const seenKeys = new Set();
//   const dedupedEvents = [];

//   for (let event of allEvents) {
//     const dateKey = event.dateTime ? new Date(event.dateTime).toDateString() : "unknown";
//     const locationKey = (event.location || "").toLowerCase().trim();
//     const uniqueKey = `${event.id}_${dateKey}_${locationKey}`;

//     if (!seenKeys.has(uniqueKey)) {
//       seenKeys.add(uniqueKey);
//       dedupedEvents.push(event);
//     }
//   }

//   // User preferences
//   const userPrefsObj = userData?.preferences || {};
//   const flatPrefsString = JSON.stringify(userPrefsObj).toLowerCase();

//   const enrichedEvents = await Promise.all(dedupedEvents.map(async (event) => {
//     const distance =
//       event.latitude && event.longitude
//         ? getDistanceFromLatLonInKm(
//             parseFloat(latitude),
//             parseFloat(longitude),
//             event.latitude,
//             event.longitude
//           )
//         : Number.MAX_SAFE_INTEGER;

//     const isWithinRadius = distance <= radius || event.source === "UNI Featured";

//     if (!isWithinRadius && expandRadius !== "true") {
//       return null;
//     }

//     // Total RSVP / Like / Share count
//     const interactionStats = await prisma.eventAttendance.aggregate({
//       _count: {
//         isGoing: true,
//         isLiked: true,
//         isShared: true,
//       },
//       where: { externalId: event.id },
//     });

//     // Current user interaction
//     const interaction = await prisma.eventAttendance.findUnique({
//       where: {
//         eventId_userId: {
//           eventId: event.id,
//           userId,
//         },
//       },
//     });

//     // Relevance Score using user preference tags
//     const eventTags = event.preferences || [];
//     const matchCount = eventTags.filter((tag) =>
//       flatPrefsString.includes(String(tag).toLowerCase())
//     ).length;

//     return {
//       ...event,
//       distance,
//       interaction: {
//         isLiked: interaction?.isLiked || false,
//         isGoing: interaction?.isGoing || false,
//         isShared: interaction?.isShared || false,
//       },
//       rsvps: interactionStats._count.isGoing,
//       likes: interactionStats._count.isLiked,
//       shares: interactionStats._count.isShared,
//       relevanceScore: matchCount,
//     };
//   }));

//   const cleanEvents = enrichedEvents.filter(Boolean);

//   const scoredEvents = cleanEvents.map((event) => {
//     const proximityFactor = 1 / (event.distance + 1);
//     const engagementFactor = (event.rsvps || 0) + (event.likes || 0) + (event.shares || 0);
//     const relevanceFactor = event.relevanceScore || 0;

//     const score = (3 * proximityFactor) + (2 * engagementFactor) + (1 * relevanceFactor);

//     return { ...event, score };
//   });

//   scoredEvents.sort((a, b) => b.score - a.score);

//   res.status(200).json({
//     status: "success",
//     message: "Events and places fetched successfully.",
//     data: {
//       results: scoredEvents,
//     },
//   });
// });


// new api as on 22 april 4.30 api is in good condition and in this api the feature of algorithm is also done so it will be live on monday means 28 april 2025. 

// exports.getEvents = catchAsync(async (req, res, next) => {
//   let {
//     query,
//     placeCategory = "",
//     city = "",
//     eventCategory = "",
//     latitude,
//     longitude,
//     radius = 75,
//     expandRadius = "false",
//   } = req.query;

//   const userId = req.user.id;
//   const userData = await authService.findUserById(userId);
//   const milesToMeters = (miles) => miles * 1609.34;
//   console.log(milesToMeters, 'meters')

//   if (!latitude || !longitude) {
//     latitude = userData?.lat;
//     longitude = userData?.long;
//   }

//   const expandedRadius = expandRadius === "true" ? 150 : radius;

//   const shouldCallTicketmaster = eventCategory.trim() !== "";
//   const shouldCallGooglePlaces = placeCategory.trim() !== "";
//   const callBothUnfiltered = !shouldCallTicketmaster && !shouldCallGooglePlaces;

//   const [ticketmasterRaw, googlePlacesRaw, dbEventsRaw] = await Promise.all([
//     (shouldCallTicketmaster || callBothUnfiltered)
//       ? eventService.fetchTicketmasterEvents({
//           query,
//           city,
//           eventCategory: shouldCallTicketmaster ? eventCategory : undefined,
//           latitude,
//           longitude,
//           radius: expandedRadius,
//         }) : [],
//     (shouldCallGooglePlaces || callBothUnfiltered)
//       ? eventService.fetchGooglePlaces({
//           query,
//           placeCategory: shouldCallGooglePlaces ? placeCategory : undefined,
//           city,
//           latitude,
//           longitude,
//           // radius: expandedRadius,
//           radius: milesToMeters(expandedRadius)

//         }) : [],
//     eventService.getEventsFromDb(),
//   ]);

//   const now = new Date();

//   const ticketmasterEvents = ticketmasterRaw
//     .filter((e) => new Date(e.dates?.start?.dateTime) > now)
//     .map((e) => eventDto(e));

//   const googlePlaces = googlePlacesRaw.map((p) => placeDto(p));

//   const dbEvents = dbEventsRaw
//     .filter((e) => new Date(e.dateTime) > now)
//     .map((e) => dbEventDto(e));

//   let allEvents = [...ticketmasterEvents, ...googlePlaces, ...dbEvents];

//   const seenKeys = new Set();
//   const dedupedEvents = [];

//   for (let event of allEvents) {
//     const dateKey = event.dateTime ? new Date(event.dateTime).toDateString() : "unknown";
//     const locationKey = (event.location || "").toLowerCase().trim();
//     const uniqueKey = `${event.id}_${dateKey}_${locationKey}`;

//     if (!seenKeys.has(uniqueKey)) {
//       seenKeys.add(uniqueKey);
//       dedupedEvents.push(event);
//     }
//   }

//   // User preferences
//   const userPrefsObj = userData?.preferences || {};
//   const flatPrefsString = JSON.stringify(userPrefsObj).toLowerCase();

//   const enrichedEvents = await Promise.all(dedupedEvents.map(async (event) => {
//     const distance =
//       event.latitude && event.longitude
//         ? getDistanceFromLatLonInMiles(
//             parseFloat(latitude),
//             parseFloat(longitude),
//             event.latitude,
//             event.longitude
//           )
//         : Number.MAX_SAFE_INTEGER;

//     const isWithinRadius = distance <= radius || event.source === "UNI Featured";

//     if (!isWithinRadius && expandRadius !== "true") {
//       return null;
//     }

//     // Total RSVP / Like / Share count
//     const interactionStats = await prisma.eventAttendance.aggregate({
//       _count: {
//         isGoing: true,
//         isLiked: true,
//         isShare: true,
//       },
//       where: { externalId: event.id },
//     });

//     // Current user interaction
//     const interaction = await prisma.eventAttendance.findUnique({
//       where: {
//         eventId_userId: {
//           eventId: event.id,
//           userId,
//         },
//       },
//     });

//     // Relevance Score using user preference tags
//     const eventTags = event.preferences || [];
//     const matchCount = eventTags.filter((tag) =>
//       flatPrefsString.includes(String(tag).toLowerCase())
//     ).length;

//     return {
//       ...event,
//       distance,
//       interaction: {
//         isLiked: interaction?.isLiked || false,
//         isGoing: interaction?.isGoing || false,
//         isShared: interaction?.isShare || false,
//       },
//       rsvps: interactionStats._count.isGoing,
//       likes: interactionStats._count.isLiked,
//       shares: interactionStats._count.isShare,
//       relevanceScore: matchCount,
//     };
//   }));

//   const cleanEvents = enrichedEvents.filter(Boolean);

//   const scoredEvents = cleanEvents.map((event) => {
//     const proximityFactor = 1 / (event.distance + 1);
//     const engagementFactor = (event.rsvps || 0) + (event.likes || 0) + (event.shares || 0);
//     const relevanceFactor = event.relevanceScore || 0;

//     const score = (3 * proximityFactor) + (2 * engagementFactor) + (1 * relevanceFactor);

//     return { ...event, score };
//   });

//   scoredEvents.sort((a, b) => b.score - a.score);

//   res.status(200).json({
//     status: "success",
//     message: "Events and places fetched successfully.",
//     data: {
//       results: scoredEvents,
//     },
//   });
// });




// new api as on 22 april 4.30 api is in good condition and in this api the feature of algorithm is also done so it will be live on monday means 28 april 2025. 

// ------------------------new working code from 21 april 2025-----------------------------//


// 🔍 Haversine formula helper
// function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
//   const deg2rad = (deg) => deg * (Math.PI / 180);
//   const R = 6371; // Radius of the earth in km

//   const dLat = deg2rad(lat2 - lat1);
//   const dLon = deg2rad(lon2 - lon1);

//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(deg2rad(lat1)) *
//       Math.cos(deg2rad(lat2)) *
//       Math.sin(dLon / 2) *
//       Math.sin(dLon / 2);

//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   const distance = R * c;

//   return distance; // in km
// }


function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const deg2rad = (deg) => deg * (Math.PI / 180);
  const R = 6371; // Radius of the earth in km

  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (isNaN(distance) || !isFinite(distance)) {
    return null; // if something is wrong, return null
  }

  return distance.toFixed(2); // example: 12.34 km
}



function getDistanceFromLatLonInMiles(lat1, lon1, lat2, lon2) {
  const deg2rad = (deg) => deg * (Math.PI / 180);
  const R = 3958.8; // Radius of the earth in miles

  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // in miles
}




//---------------------- AI Search Api ------------------------//

// controllers/eventController.js

// exports.aiSearchEvents = catchAsync(async (req, res, next) => {
//   const { query } = req.query;
//   const userId = req.user.id;

//   if (!query || query.trim() === "") {
//     return next(new AppError("Query parameter is required", 400));
//   }

//   const userData = await authService.findUserById(userId);
//   let latitude = userData?.lat;
//   let longitude = userData?.long;

//   const extractedData = await extractSearchIntent(query);

//   const {
//     keywords = "",
//     city = "",
//     segment = "",
//     genre = "",
//     subGenre = "",
//     type = "",
//     subType = "",
//     lat = latitude ? latitude : req.query.latitude,
//     long = longitude ? longitude : req.query.longitude,
//     // radius = 75,
//   } = extractedData;

//   console.log(extractedData, 'data')
//   latitude = lat ?? latitude;
//   longitude = long ?? longitude;

//   // const milesToMeters = (miles) => miles * 1609.34;

//   const [ticketmasterRaw, googlePlacesRaw, dbEventsRaw] = await Promise.all([
//     eventService.fetchTicketmasterEventsForAISearch({
//       query: keywords,
//       city,
//       latitude,
//       longitude,
//       eventCategory: segment || genre || subGenre,
//       segmentName: segment,
//       // radius,
//     }),
//     eventService.fetchGooglePlaces({
//       query: keywords,
//       city,
//       latitude,
//       longitude,
//       placeCategory: segment || genre || subGenre,
//       // radius: milesToMeters(radius),
//     }),
//     eventService.getEventsFromDb({
//       query: keywords,
//       latitude,
//       longitude,
//     }),
//   ]);

//   const now = new Date();

//   const ticketmasterEvents = ticketmasterRaw
//     .filter((e) => new Date(e.dates?.start?.dateTime) > now)
//     .map((e) => eventDto(e));

//   const googlePlaces = googlePlacesRaw.map((p) => placeDto(p));

//   const dbEvents = dbEventsRaw
//     .filter((e) => new Date(e.dateTime) > now)
//     .map((e) => dbEventDto(e));

//   const allEvents = [...ticketmasterEvents, ...googlePlaces, ...dbEvents];

//   const seenKeys = new Set();
//   const dedupedEvents = [];

//   for (let event of allEvents) {
//     const dateKey = event.dateTime ? new Date(event.dateTime).toDateString() : "unknown";
//     const locationKey = (event.location || "").toLowerCase().trim();
//     const uniqueKey = `${event.id}_${dateKey}_${locationKey}`;

//     if (!seenKeys.has(uniqueKey)) {
//       seenKeys.add(uniqueKey);
//       dedupedEvents.push(event);
//     }
//   }

//   const enrichedEvents = dedupedEvents.map((event) => {
//     const distance = event.latitude && event.longitude
//       ? getDistanceFromLatLonInKm(parseFloat(latitude), parseFloat(longitude), event.latitude, event.longitude)
//       : Number.MAX_SAFE_INTEGER;

//     return { ...event, distance };
//   });

//   const finalResults = await Promise.all(
//     enrichedEvents.map(async (event) => {
//       const interaction = await eventService.getInteractionDetails({
//         externalId: event.id,
//         userId,
//       }).catch(() => null);

//       return {
//         ...event,
//         interaction: interaction || { isLiked: false, isGoing: false },
//       };
//     })
//   );

//   finalResults.sort((a, b) => {
//     const dateA = a.dateTime ? new Date(a.dateTime) : new Date(8640000000000000);
//     const dateB = b.dateTime ? new Date(b.dateTime) : new Date(8640000000000000);
//     if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
//     return a.distance - b.distance;
//   });

//   res.status(200).json({
//     status: "success",
//     message: "AI-powered event search successful.",
//     data: {
//       results: finalResults,
//     },
//   });
// });


exports.aiSearchEvents = catchAsync(async (req, res, next) => {
  const { query, latitude, longitude, radius = 75 } = req.query;
  const userId = req.user.id;

  if (!query || query.trim() === "") {
    return next(new AppError("Query parameter is required", 400));
  }

  if (!latitude || !longitude) {
    return next(new AppError("Latitude and Longitude are required", 400));
  }

  const extractedData = await extractSearchIntent(query);
  const {
    keywords = "",
    city = "",
    segment = "",
    genre = "",
    subGenre = "",
    type = "",
    subType = ""
  } = extractedData;

  console.log(extractedData, 'dataaaaaaaaa')
  const [ticketmasterRaw, googlePlacesRaw, dbEventsRaw] = await Promise.all([
    eventService.fetchTicketmasterEventsForAISearch({
      keyword:  keywords,
      city,
      latitude,
      longitude,
      eventCategory: segment || genre || subGenre,
      segmentName: segment,
      radius,
    }),
    eventService.fetchGooglePlaces({
      query: keywords,
      city,
      latitude,
      longitude,
      placeCategory: segment || genre || subGenre,
      radius: radius * 1609.34, // Convert miles to meters
    }),
    eventService.getEventsFromDb({
      query: keywords,
      latitude,
      longitude,
    }),
  ]);

  const now = new Date();

  const ticketmasterEvents = ticketmasterRaw
    .filter((e) => new Date(e.dates?.start?.dateTime) > now)
    .map((e) => eventDto(e));

  const googlePlaces = googlePlacesRaw.map((p) => placeDto(p));

  const dbEvents = dbEventsRaw
    .filter((e) => new Date(e.dateTime) > now)
    .map((e) => dbEventDto(e));

  const allEvents = [...ticketmasterEvents, ...googlePlaces, ...dbEvents];

  const seenKeys = new Set();
  const dedupedEvents = [];

  for (let event of allEvents) {
    const dateKey = event.dateTime ? new Date(event.dateTime).toDateString() : "unknown";
    const locationKey = (event.location || "").toLowerCase().trim();
    const uniqueKey = `${event.id}_${dateKey}_${locationKey}`;

    if (!seenKeys.has(uniqueKey)) {
      seenKeys.add(uniqueKey);
      dedupedEvents.push(event);
    }
  }

  const enrichedEvents = dedupedEvents.map((event) => {
    const distance = event.latitude && event.longitude
      ? getDistanceFromLatLonInKm(parseFloat(latitude), parseFloat(longitude), event.latitude, event.longitude)
      : Number.MAX_SAFE_INTEGER;

    return { ...event, distance };
  });

  const finalResults = await Promise.all(
    enrichedEvents.map(async (event) => {
      const interaction = await eventService.getInteractionDetails({
        externalId: event.id,
        userId,
      }).catch(() => null);

      return {
        ...event,
        interaction: interaction || { isLiked: false, isGoing: false },
      };
    })
  );

  finalResults.sort((a, b) => {
    const dateA = a.dateTime ? new Date(a.dateTime) : new Date(8640000000000000);
    const dateB = b.dateTime ? new Date(b.dateTime) : new Date(8640000000000000);
    if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
    return a.distance - b.distance;
  });

  res.status(200).json({
    status: "success",
    message: "AI-powered event search successful.",
    data: {
      results: finalResults,
    },
  });
});




//---------------------- AI Search Api ------------------------//


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

  console.log('hello',)
  const { eventId } = req.params;
  if (!eventId) {
    return next(new AppError("Event ID is required.", 401));
  }

  const userId = req.user.id;
  console.log('hello',userId)
  // Fetch event details
  let externalId=eventId;
  const eventDetails = await eventService.getEventDetails({
    externalId,
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
  const { isLiked, isGoing,isShare, eventData } = req.body;
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

  if (isShare !== undefined && typeof isShare !== "boolean") {
    return next(new AppError("isGoing must be a boolean value", 401));
  }

  // Handle the interaction through the service
  const attendanceRecord = await eventService.handleInteraction({
    userId,
    eventId,
    isLiked,
    isGoing,
    isShare,
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
    source: "UNI Featured",
    ageMin: req.body.ageMin ? parseInt(req.body.ageMin, 10) : null,
    ageMax: req.body.ageMax ? parseInt(req.body.ageMax, 10) : null,
    latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
    longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
  };

  let imageUrl = null;
console.log(imageUrl, 'image')
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

  console.log(req.body, 'body')
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


// GET /api/events
exports.getAllEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      status: 'success',
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch events',
      error: error.message,
    });
  }
};

// DELETE /api/events
exports.deleteAllEvents = async (req, res) => {
  try {
   const a =  await prisma.event.deleteMany({ where: {
      latitude: null,
      longitude: null,
    }});
console.log(a , 'aaaa')
    res.status(200).json({
      status: 'success',
      message: 'All events deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete events',
      error: error.message,
    });
  }
};
