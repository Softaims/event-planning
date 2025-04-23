// commmented from 22 april 

// const dbEventDto = (event) => {
//   return {
//     id: event.id,
//     name: event.name,
//     description: event.description || "", 
//     dateTime: event.dateTime || null,
//     image: event.image || null, 
//     source: event.source || "", 
//     location: event.location || null, 
//     ageMin: event.ageMin || 0, 
//     ageMax: event.ageMax || 0, 
//     ticketUrls: event.ticketUrls || [],
//     latitude: event.latitude || null,
//     longtitude: event.longtitude || null
//   };
// };


// const dbEventListDto = (events) => {
//   return events.map((event) => dbEventDto(event));
// };

// module.exports = {
//   dbEventDto,
//   dbEventListDto,
// };


const dbEventDto = (event) => {
  let preferences = [];

  // If event.preferences is a JSON object, extract keys + values as strings
  if (event.preferences && typeof event.preferences === "object") {
    const flatPrefs = [];

    const flattenPrefs = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
          flattenPrefs(obj[key]);
        } else if (Array.isArray(obj[key])) {
          flatPrefs.push(...obj[key].map(String));
        } else {
          flatPrefs.push(String(obj[key]));
        }
      }
    };

    flattenPrefs(event.preferences);
    preferences = flatPrefs.map((val) => val.toLowerCase().trim());
  }

  return {
    id: event.id,
    name: event.name,
    description: event.description || "", 
    dateTime: event.dateTime || null,
    image: event.image || null, 
    source: event.source || "UNI DB", 
    location: event.location || null, 
    ageMin: event.ageMin || 0, 
    ageMax: event.ageMax || 0, 
    ticketUrls: event.ticketUrls || [],
    latitude: event.latitude || null,
    longitude: event.longitude || null,
    preferences, // <-- for relevance scoring
  };
};

const dbEventListDto = (events) => {
  return events.map((event) => dbEventDto(event));
};

module.exports = {
  dbEventDto,
  dbEventListDto,
};
