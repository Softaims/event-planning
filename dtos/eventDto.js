const eventDto = (event) => {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    dateTime: {
      start: event.dates?.start?.dateTime,
      end: event.dates?.end?.dateTime,
    },
    images: event.images || [],
    location: {
      name: event._embedded?.venues?.[0]?.name,
      address: event._embedded?.venues?.[0]?.address?.line1,
      city: event._embedded?.venues?.[0]?.city?.name,
      country: event._embedded?.venues?.[0]?.country?.name,
    },
  };
};

const eventListDto = (events) => {
  return events.map((event) => eventDto(event));
};

module.exports = {
  eventDto,
  eventListDto,
};
