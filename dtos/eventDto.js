const eventDto = (event) => {
  return {
    id: event.id,
    name: event.name,
    description: event.description || "",
    dateTime: event.dates?.start?.dateTime || "",
    image: event.images?.[0]?.url || [],
    source: "ticketmaster",
    location: `${event._embedded?.venues?.[0]?.name}, ${event._embedded?.venues?.[0]?.address?.line1}, ${event._embedded?.venues?.[0]?.city?.name}, ${event._embedded?.venues?.[0]?.country?.name}`,
    ageMin: 0,
    ageMax: 0,
    ticketUrls: [],
  };
};

const eventListDto = (events) => {
  return events.map((event) => eventDto(event));
};

module.exports = {
  eventDto,
  eventListDto,
};
