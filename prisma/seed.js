import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

// Settings for seed data
const NUM_USER_CREATED_EVENTS = 5; // Events created by each user
const NUM_EXTERNAL_EVENTS = 10; // External events to create (half Ticketmaster, half Google Places)
const SOURCES = ["ticketmaster", "Google Places"]; // Only these two external sources
const USER_IDS = [1, 2]; // Users for whom we'll create events and interactions

async function main() {
  try {
    console.log("Starting seed process...");

    // Create user-created events for each user
    const userCreatedEvents = [];

    for (const userId of USER_IDS) {
      console.log(`Creating events for user ID ${userId}...`);

      for (let i = 0; i < NUM_USER_CREATED_EVENTS; i++) {
        const event = await prisma.event.create({
          data: {
            id: uuidv4(),
            name: faker.company.catchPhrase(),
            description: faker.lorem.paragraphs(2),
            dateTime: faker.date.future(),
            image: `https://picsum.photos/seed/${faker.number.int(
              99999
            )}/800/600`,
            source: "uni", // User-created event
            location: faker.location.streetAddress(),
            ageMin: faker.number.int({ min: 16, max: 21 }),
            ageMax: faker.number.int({ min: 22, max: 65 }),
            ticketUrls: [faker.internet.url()],
            preferences: {
              categories: [
                faker.word.sample(),
                faker.word.sample(),
                faker.word.sample(),
              ],
            },
            userId: userId,
          },
        });

        userCreatedEvents.push(event);
        console.log(`Created user event: ${event.name}`);
      }
    }

    // Create external events - half from Ticketmaster, half from Google Places
    const externalEvents = [];

    for (let i = 0; i < NUM_EXTERNAL_EVENTS; i++) {
      // Alternate between Ticketmaster and Google Places
      const source = SOURCES[i % 2];

      // Set location format based on source
      let location;
      if (source === "Google Places") {
        // Google Places typically has full address
        location = `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`;
      } else {
        // Ticketmaster often has venue names
        location = `${faker.company.name()} Arena, ${faker.location.city()}`;
      }

      const event = await prisma.event.create({
        data: {
          id: uuidv4(),
          externalId:
            source === "ticketmaster"
              ? `TM-${faker.string.alphanumeric(10)}` // Ticketmaster ID format
              : `GP-${faker.string.alphanumeric(16)}`, // Google Places ID format
          name:
            source === "ticketmaster"
              ? `${faker.music.songName()} - ${faker.person.fullName()} Tour`
              : faker.company.catchPhrase(),
          description: faker.lorem.paragraphs(2),
          dateTime: faker.date.future(),
          image: `https://picsum.photos/seed/${faker.number.int(
            99999
          )}/800/600`,
          source: source,
          location: location,
          ageMin:
            source === "ticketmaster"
              ? faker.number.int({ min: 0, max: 21 })
              : null,
          ageMax:
            source === "ticketmaster"
              ? faker.number.int({ min: 65, max: 100 })
              : null,
          ticketUrls:
            source === "ticketmaster"
              ? [
                  faker.internet.url({
                    protocol: "https",
                    domain: "ticketmaster.com",
                  }),
                ]
              : [],
          preferences:
            source === "ticketmaster"
              ? {
                  genre: faker.music.genre(),
                  venue_type: faker.helpers.arrayElement([
                    "stadium",
                    "arena",
                    "theater",
                    "club",
                  ]),
                }
              : {
                  type: faker.helpers.arrayElement([
                    "restaurant",
                    "bar",
                    "cafe",
                    "museum",
                    "park",
                    "shopping",
                  ]),
                  rating: faker.number.float({
                    min: 3.0,
                    max: 5.0,
                    precision: 0.1,
                  }),
                },
        },
      });

      externalEvents.push(event);
      console.log(`Created external event from ${source}: ${event.name}`);
    }

    // Create interactions for all users
    const allEvents = [...userCreatedEvents, ...externalEvents];

    for (const userId of USER_IDS) {
      console.log(`Creating interactions for user ID ${userId}...`);

      // Each user interacts with some random subset of events
      const eventsToInteractWith = faker.helpers.arrayElements(
        allEvents,
        faker.number.int({ min: 5, max: allEvents.length })
      );

      for (const event of eventsToInteractWith) {
        const isUserOwnEvent = event.userId === userId;

        // Users always like and attend their own events
        const isLiked = isUserOwnEvent ? true : faker.datatype.boolean(0.6);
        const isGoing = isUserOwnEvent ? true : faker.datatype.boolean(0.4);

        const interaction = await prisma.eventAttendance.create({
          data: {
            id: uuidv4(),
            eventId: event.id,
            userId: userId,
            isGoing: isGoing,
            isLiked: isLiked,
            createdAt: faker.date.recent(),
          },
        });

        console.log(
          `Created interaction for user ${userId} with event ${event.name} (Going: ${isGoing}, Liked: ${isLiked})`
        );
      }
    }

    console.log("Seed completed successfully!");
    console.log(`Created ${userCreatedEvents.length} user events`);
    console.log(
      `Created ${externalEvents.length} external events (${Math.ceil(
        NUM_EXTERNAL_EVENTS / 2
      )} Ticketmaster, ${Math.floor(NUM_EXTERNAL_EVENTS / 2)} Google Places)`
    );
    console.log(`Created interactions for ${USER_IDS.length} users`);
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
