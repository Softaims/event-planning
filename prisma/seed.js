import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import constants from "../constants/index.js";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  // await prisma.eventAttendance.deleteMany({});
  // await prisma.externalEvent.deleteMany({});
  // await prisma.event.deleteMany({});
  // await prisma.user.deleteMany({});

  // Create 20 users with verified phone numbers
  const users = [];

  // Get values from constants file
  // Ensure these match the structure of your constants file
  const colleges = constants.colleges || [];
  const majors = constants.majors || [];
  const zodiacSigns = constants.zodiacSigns || [];
  const relationshipStatuses = constants.relationshipStatuses || [];
  const musicGenres = constants.musicGenres || [];

  // For interests, check the structure in your constants file
  const techDigitalInterests = constants.interests?.techDigital || [];
  const creativeArtsInterests = constants.interests?.creativeArts || [];
  const sportsGamingInterests = constants.interests?.sportsGaming || [];

  // Create users with different preference patterns
  for (let i = 0; i < 20; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName });

    // Create interest patterns
    // Some users have many interests, some have few
    const techInterests = faker.helpers.arrayElements(
      techDigitalInterests,
      faker.number.int({
        min: 0,
        max: Math.min(5, techDigitalInterests.length),
      })
    );

    const creativeInterests = faker.helpers.arrayElements(
      creativeArtsInterests,
      faker.number.int({
        min: 0,
        max: Math.min(5, creativeArtsInterests.length),
      })
    );

    const sportsInterests = faker.helpers.arrayElements(
      sportsGamingInterests,
      faker.number.int({
        min: 0,
        max: Math.min(5, sportsGamingInterests.length),
      })
    );

    // Generate random preferences
    const preferences = {
      bio: faker.lorem.paragraph(),
      major: faker.helpers.arrayElement(
        majors.length > 0 ? majors : ["Computer Science"]
      ),
      college: faker.helpers.arrayElement(
        colleges.length > 0
          ? colleges
          : ["University of Maryland, College Park (UMD)"]
      ),
      interests: {
        techDigital: techInterests,
        creativeArts: creativeInterests,
        sportsGaming: sportsInterests,
      },
      musicGenre: faker.helpers.arrayElement(
        musicGenres.length > 0 ? musicGenres : ["Pop"]
      ),
      zodiacSign: faker.helpers.arrayElement(
        zodiacSigns.length > 0 ? zodiacSigns : ["Aries"]
      ),
      socialLinks: {
        Facebook: faker.datatype.boolean()
          ? `https://facebook.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`
          : "",
        Instagram: faker.datatype.boolean()
          ? `https://instagram.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`
          : "",
      },
      collegeClubs: constants.collegeClubs
        ? faker.helpers.arrayElements(
            constants.collegeClubs,
            faker.number.int({ min: 0, max: 3 })
          )
        : [],
      favoriteShows: constants.shows
        ? faker.helpers.arrayElements(
            constants.shows,
            faker.number.int({ min: 0, max: 5 })
          )
        : [],
      graduatingYear: faker.number.int({ min: 2024, max: 2028 }),
      favoriteArtists: constants.artists
        ? faker.helpers.arrayElements(
            constants.artists,
            faker.number.int({ min: 0, max: 5 })
          )
        : [],
      favoritePlacesToGo: constants.places
        ? faker.helpers.arrayElements(
            constants.places,
            faker.number.int({ min: 0, max: 4 })
          )
        : [],
      relationshipStatus: faker.helpers.arrayElement(
        relationshipStatuses.length > 0 ? relationshipStatuses : ["Single"]
      ),
      favoriteSportsTeams: constants.sportsTeams
        ? faker.helpers.arrayElements(
            constants.sportsTeams,
            faker.number.int({ min: 0, max: 3 })
          )
        : [],
    };

    const user = await prisma.user.create({
      data: {
        email,
        emailVerified: faker.datatype.boolean(),
        password: faker.internet.password(),
        firstName,
        lastName,
        phoneNumber: faker.phone.number(),
        phoneVerified: true, // All users have verified phone numbers
        dob: faker.date.birthdate({ min: 18, max: 30, mode: "age" }),
        pronouns: "he_him",
        profileImage: faker.datatype.boolean() ? faker.image.avatar() : null,
        active: true,
        role: "User",
        preferences,
        isRegistrationComplete: true,
        lat: faker.location.latitude(),
        long: faker.location.longitude(),
      },
    });

    users.push(user);
  }

  console.log(`Created ${users.length} users`);

  // Create 10 events by the first user (Admin)
  const eventLocations = [
    "University Auditorium",
    "Student Center",
    "Campus Lawn",
    "Engineering Building",
    "Arts Department",
    "University Stadium",
    "Library Hall",
    "Computer Science Building",
    "Music Department",
    "Recreation Center",
  ];

  const events = [];
  for (let i = 0; i < 10; i++) {
    const event = await prisma.event.create({
      data: {
        name: faker.word.words({ count: { min: 2, max: 5 } }),
        description: faker.lorem.paragraphs(2),
        dateTime: faker.date.future(),
        image: faker.image.urlLoremFlickr({ category: "event" }),
        source: "uni",
        location: faker.helpers.arrayElement(eventLocations),
        ageMin: faker.number.int({ min: 18, max: 21 }),
        ageMax: faker.number.int({ min: 22, max: 50 }),
        ticketUrls: Array(faker.number.int({ min: 1, max: 3 }))
          .fill(null)
          .map(() => faker.internet.url()),
        preferences: {
          type: faker.helpers.arrayElement([
            "academic",
            "social",
            "career",
            "entertainment",
          ]),
          category: faker.helpers.arrayElement([
            "workshop",
            "party",
            "lecture",
            "concert",
          ]),
        },
        userId: users[0].id, // First user creates all events
      },
    });

    events.push(event);
  }

  console.log(`Created ${events.length} events`);

  // Create 5 external events
  const externalEvents = [];
  for (let i = 0; i < 5; i++) {
    const externalEvent = await prisma.externalEvent.create({
      data: {
        source: "uni",
        name: faker.word.words({ count: { min: 2, max: 5 } }),
        description: faker.lorem.paragraphs(2),
        image: faker.image.urlLoremFlickr({ category: "event" }),
        location: faker.helpers.arrayElement(eventLocations),
        dateTime: faker.date.future(),
      },
    });

    externalEvents.push(externalEvent);
  }

  console.log(`Created ${externalEvents.length} external events`);

  // Create event attendances - users attend both regular and external events
  // For regular events
  for (const event of events) {
    // Random subset of users attend each event
    const attendingUsers = faker.helpers.arrayElements(
      users,
      faker.number.int({ min: 5, max: 15 })
    );

    for (const user of attendingUsers) {
      await prisma.eventAttendance.create({
        data: {
          eventId: event.id,
          userId: user.id,
          isGoing: faker.datatype.boolean(0.7), // 70% likelihood of going
          isLiked: faker.datatype.boolean(0.5), // 50% likelihood of liking
        },
      });
    }
  }

  // For external events
  for (const externalEvent of externalEvents) {
    // Random subset of users attend each external event
    const attendingUsers = faker.helpers.arrayElements(
      users,
      faker.number.int({ min: 5, max: 15 })
    );

    for (const user of attendingUsers) {
      await prisma.eventAttendance.create({
        data: {
          eventId: "", // Empty string for external events
          externalEventId: externalEvent.id,
          userId: user.id,
          isGoing: faker.datatype.boolean(0.7), // 70% likelihood of going
          isLiked: faker.datatype.boolean(0.5), // 50% likelihood of liking
        },
      });
    }
  }

  console.log("Event attendances created");

  console.log("Seeding completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
