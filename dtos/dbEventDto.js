// dbEventDto: Transforms a single event into the required format
const dbEventDto = (event) => {
  return {
    id: event.id,
    name: event.name,
    description: event.description || "", 
    dateTime: event.dateTime || "",
    image: event.image || "", 
    source: event.source || "", 
    location: event.location || "", 
    ageMin: event.ageMin || 0, 
    ageMax: event.ageMax || 0, 
    ticketUrls: event.ticketUrls || [],
  };
};


const dbEventListDto = (events) => {
  return events.map((event) => dbEventDto(event));
};

module.exports = {
  dbEventDto,
  dbEventListDto,
};
