// const placeDto = (place) => {
//   return {
//     id: place.place_id,
//     name: place.name,
//     description: place.description || "",
//     dateTime: null,
//     image: null,
//     source: "Google Places",
//     location: place.formatted_address,
//     ageMin: 0,
//     ageMax: 0,
//     ticketUrls: [],
//   };
// };


// commented on 22 april 
// const placeDto = (place) => {
//   const photoReference = place.photos?.[0]?.photo_reference;
//   const imageUrl = photoReference
//     ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${process.env.GOOGLE_PLACES_API_KEY}`
//     : null;

//   return {
//     id: place.place_id,
//     name: place.name,
//     description: place.description || "",
//     dateTime: place.dateTime || null, // Only if you inject a date from somewhere else
//     image: imageUrl,
//     source: "Google Places",
//     location: place.vicinity || place.formatted_address || "",
//     ageMin: 0,
//     ageMax: 0,
//     latitude: place.geometry?.location?.lat || null, // Add lat
//     longitude: place.geometry?.location?.lng || null, // Add lng

//     ticketUrls: [],
//   };
// };


// const placeListDto = (places) => {
//   return places.map((place) => placeDto(place));
// };

// module.exports = {
//   placeDto,
//   placeListDto,
// };


// new dto from 22 april 
const placeDto = (place) => {
  const photoReference = place.photos?.[0]?.photo_reference;
  const imageUrl = photoReference
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${process.env.GOOGLE_PLACES_API_KEY}`
    : null;

  const preferenceTags = place.types || []; // e.g. ['cafe', 'bar', 'restaurant']

  return {
    id: place.place_id,
    name: place.name,
    description: place.description || "",
    dateTime: place.dateTime || null, // Only if injected manually
    image: imageUrl,
    source: "Google Places",
    location: place.vicinity || place.formatted_address || "",
    ageMin: 0,
    ageMax: 0,
    latitude: place.geometry?.location?.lat || null,
    longitude: place.geometry?.location?.lng || null,
    ticketUrls: [],
    preferences: preferenceTags, // <-- For relevance scoring
  };
};

const placeListDto = (places) => {
  return places.map((place) => placeDto(place));
};

module.exports = {
  placeDto,
  placeListDto,
};

