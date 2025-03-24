const { prisma } = require("../db");
const { sendNotification } = require("./sendNotification");
const cron = require("node-cron");
const { calculateMatchPercentage } = require("./../utils/calculateMatchPercentage ");

// Notify users when an event becomes popular
exports.notifyPopularEvent = async (eventId, eventName) => {
  const goingCount = await prisma.eventAttendance.count({
    where: { eventId, isGoing: true },
  });

  if (goingCount % 50 === 0) {
    const usersToNotify = await prisma.eventAttendance.findMany({
      where: { eventId, isLiked: true, isGoing: false },
      select: { userId: true },
    });

    await Promise.all(
      usersToNotify.map(user => 
        sendNotification(user.userId, {
          title: "Event is Getting Popular!",
          body: `The event "${eventName}" has over ${goingCount} attendees. Join in before it's full!`,
        })
      )
    );
  }
};

// Recommend events based on similar users' preferences
exports.popularByPreferences = async (eventId, eventName) => {
  const likedUsers = await prisma.eventAttendance.findMany({
    where: { eventId, isLiked: true },
    select: { userId: true },
  });

  const likedUserIds = likedUsers.map(user => user.userId);
  if (likedUserIds.length === 0) return;

  const likedUserPreferences = await prisma.user.findMany({
    where: { id: { in: likedUserIds } },
    select: { id: true, preferences: true },
  });

  const potentialUsers = await prisma.user.findMany({
    where: { id: { notIn: likedUserIds } },
    select: { id: true, preferences: true },
  });

  const notifications = [];

  for (const user of potentialUsers) {
    let bestMatchScore = 0;

    for (const likedUser of likedUserPreferences) {
      if (!user.preferences || !likedUser.preferences) continue;

      const matchScore = calculateMatchPercentage(user.preferences, likedUser.preferences);
      bestMatchScore = Math.max(bestMatchScore, matchScore);
    }

    if (bestMatchScore >= 70) {
      notifications.push(sendNotification(user.id, {
        title: "An Event You Might Like!",
        body: `The event "${eventName}" is popular among users with similar interests. Check it out!`,
      }));
    }
  }

  await Promise.all(notifications);
};

// Recommend an event based on user likes and similar users' likes
const recommendEventBasedOnLikes = async () => {
  try {
    console.log("Running event recommendation job...");

    // Get all users who have liked at least one event
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    for (const user of users) {
      // Find events this user has liked
      const likedEvents = await prisma.eventAttendance.findMany({
        where: { userId: user.id, isLiked: true },
        select: { eventId: true },
      });

      if (likedEvents.length === 0) continue;

      const likedEventIds = likedEvents.map(e => e.eventId);

      // Find other users who liked these events
      const similarUsers = await prisma.eventAttendance.findMany({
        where: { eventId: { in: likedEventIds }, userId: { not: user.id }, isLiked: true },
        select: { userId: true },
      });

      if (similarUsers.length === 0) continue;

      const similarUserIds = [...new Set(similarUsers.map(u => u.userId))];

      // Find events liked by these similar users
      const suggestedEvents = await prisma.eventAttendance.findMany({
        where: { userId: { in: similarUserIds }, isLiked: true },
        select: { eventId: true },
      });

      if (suggestedEvents.length === 0) continue;

      // Count occurrences of each event
      const eventCounts = suggestedEvents.reduce((acc, { eventId }) => {
        acc[eventId] = (acc[eventId] || 0) + 1;
        return acc;
      }, {});

      // Find the most commonly liked event
      const mostLikedEventId = Object.keys(eventCounts).reduce((a, b) => 
        eventCounts[a] > eventCounts[b] ? a : b
      );

      // Fetch event details
      const eventDetails = await prisma.event.findUnique({
        where: { id: mostLikedEventId },
        select: { name: true },
      });

      if (!eventDetails) continue;

      // Send notification
      await sendNotification(user.id, {
        title: "Based on your likes: This event is about to sell out!",
        body: `Other users who liked your favorite events also liked "${eventDetails.name}". Check it out!`,
      });
    }

    console.log("Event recommendation job completed.");
  } catch (error) {
    console.error("Error in recommending events:", error);
  }
};

// Match users with events based on preferences
const matchUsersWithEvents = async () => {
  try {
    console.log("Running event-user match job...");

    const events = await prisma.event.findMany();
    const users = await prisma.user.findMany();

    for (const event of events) {
      const matchedUsers = users
        .filter(user => event.preferences && user.preferences)
        .filter(user => calculateMatchPercentage(event.preferences, user.preferences) > 70)
        .map(user => user.id);

      await Promise.all(
        matchedUsers.map(userId => 
          sendNotification(userId, {
            title: "Looking for weekend plans?",
            body: `This event matches your interests!`,
          })
        )
      );
    }

    console.log("Event-user match job completed.");
  } catch (error) {
    console.error("Error in matching users with events:", error);
  }
};

// Schedule jobs
cron.schedule("0 */12 * * *", matchUsersWithEvents);
cron.schedule("0 */12 * * *", recommendEventBasedOnLikes);
