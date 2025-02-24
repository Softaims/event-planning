const eventDto = (event) => {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    dateTime: event.dates?.start?.dateTime,
    // images: event.images || [],
    source: "ticketmaster",
    location: `${event._embedded?.venues?.[0]?.name}, ${event._embedded?.venues?.[0]?.address?.line1}, ${event._embedded?.venues?.[0]?.city?.name}, ${event._embedded?.venues?.[0]?.country?.name}`,
  };
};

const eventListDto = (events) => {
  return events.map((event) => eventDto(event));
};

module.exports = {
  eventDto,
  eventListDto,
};
