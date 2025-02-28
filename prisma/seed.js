const { PrismaClient } = require("@prisma/client");
const constants = require("../constants");
const prisma = new PrismaClient();

const getRandomItems = (arr, count = 1) => {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.sort(() => 0.5 - Math.random()).slice(0, count);
};

const getRandomInterests = () => {
  const allInterests = constants.interests
    ? Object.keys(constants.interests)
    : [];
  return getRandomItems(allInterests, 3);
};

const getDefaultPreferences = () => ({
  major: getRandomItems(constants.majors || [], 1)[0] || "",
  college: getRandomItems(constants.colleges || [], 1)[0] || "",
  interests: getRandomInterests().reduce((acc, interest) => {
    acc[interest] = getRandomItems(constants.interests?.[interest] || [], 2);
    return acc;
  }, {}),
  musicGenre: getRandomItems(constants.musicGenres || [], 1)[0] || "",
  zodiacSign: getRandomItems(constants.zodiacSigns || [], 1)[0] || "",
  collegeClubs: getRandomItems(constants.collegeClubs || [], 3),
  favoriteShows: getRandomItems(constants.tvShows || [], 3),
  favoriteArtists: getRandomItems(constants.artists || [], 3),
  favoritePlacesToGo: getRandomItems(constants.favoritePlacesToGo || [], 3),
  relationshipStatus:
    getRandomItems(constants.relationshipStatuses || [], 1)[0] || "",
  favoriteSportsTeams: getRandomItems(constants.sportsTeams || [], 3),
});

const eventsData = Array.from({ length: 20 }, (_, i) => ({
  externalId: `ext-${i + 1}`,
  name: `Event ${i + 1}`,
  description: `This is a description for Event ${i + 1}`,
  dateTime: new Date(new Date().setDate(new Date().getDate() + i)),
  image: `https://example.com/event${i + 1}.jpg`,
  source: "Test Source",
  location: `Location ${i + 1}`,
  ageMin: 18,
  ageMax: 35,
  ticketUrls: [`https://tickets.example.com/event${i + 1}`],
  preferences: getDefaultPreferences(),
  userId: 1,
}));

async function seedEvents() {
  try {
    console.log("Seeding events...");
    await prisma.event.createMany({
      data: eventsData,
    });
    console.log("Events seeded successfully.");
  } catch (error) {
    console.error("Error seeding events:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedEvents();
