// const eventDto = (event) => {
//   return {
//     id: event.id,
//     name: event.name,
//     description: event.description || "",
//     dateTime: event.dates?.start?.dateTime || null,
//     image: event.images?.[0]?.url || null,
//     source: "ticketmaster",
//     location: `${event._embedded?.venues?.[0]?.name}, ${event._embedded?.venues?.[0]?.address?.line1}, ${event._embedded?.venues?.[0]?.city?.name}, ${event._embedded?.venues?.[0]?.country?.name}`,
//     ageMin: 0,
//     ageMax: 0,
//     latitude: event._embedded?.venues?.[0]?.location?.latitude || null,
//     longitude: event._embedded?.venues?.[0]?.location?.longitude || null,
//     ticketUrls: [],
//   };
// };

// const eventListDto = (events) => {
//   return events.map((event) => eventDto(event));
// };

// module.exports = {
//   eventDto,
//   eventListDto,
// };


const eventDto = (event) => {
  const venue = event._embedded?.venues?.[0];
  const classification = event.classifications?.[0] || {};

  const preferenceTags = [
    classification.name,
    classification.genre?.name,
    classification.subGenre?.name,
    classification.segment?.name,
    classification.type?.name,
    classification.subType?.name,
  ].filter(Boolean); // remove undefined or null

  return {
    id: event.id,
    name: event.name,
    description: event.description || "",
    dateTime: event.dates?.start?.dateTime || null,
    image: event.images?.[0]?.url || null,
    source: "ticketmaster",
    location: venue
      ? `${venue.name || ""}, ${venue.address?.line1 || ""}, ${venue.city?.name || ""}, ${venue.country?.name || ""}`
      : "",
    ageMin: 0,
    ageMax: 0,
    latitude: venue?.location?.latitude || null,
    longitude: venue?.location?.longitude || null,
    ticketUrls: event.url ? [event.url] : [],
    preferences: preferenceTags, // added for preference matching
  };
};

const eventListDto = (events) => {
  return events.map((event) => eventDto(event));
};

module.exports = {
  eventDto,
  eventListDto,
};

