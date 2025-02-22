// utils/placeDto.js

const placeDto = (place) => {
    return {
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      openNow: place.opening_hours ? place.opening_hours.open_now : false,
      photos: place.photos,
      //   ? place.photos.map((photo) => photo.photo_reference)
      //   : [],
      rating: place.rating || null,
      priceLevel: place.price_level || null,
    };
  };
  
  const placeListDto = (places) => {
    return places.map((place) => placeDto(place));
  };
  
  module.exports = {
    placeDto,
    placeListDto,
  };