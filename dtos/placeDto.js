// utils/placeDto.js

const placeDto = (place) => {
  return {
    id: place.place_id,
    name: place.name,
    description: place.description,
    // images: place.photos || [],
    source: "Google Places",
    location: place.formatted_address,
  };
};

const placeListDto = (places) => {
  return places.map((place) => placeDto(place));
};

module.exports = {
  placeDto,
  placeListDto,
};
