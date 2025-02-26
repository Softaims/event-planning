const placeDto = (place) => {
  return {
    id: place.place_id,
    name: place.name,
    description: place.description || "",
    dateTime: null,
    image: null,
    source: "Google Places",
    location: place.formatted_address,
    ageMin: 0,
    ageMax: 0,
    ticketUrls: [],
  };
};

const placeListDto = (places) => {
  return places.map((place) => placeDto(place));
};

module.exports = {
  placeDto,
  placeListDto,
};
