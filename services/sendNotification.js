const admin = require("./../utils/firebase"); // Import Firebase Admin SDK

const { prisma } = require("../db");

// old code ---------
// exports.sendNotification = async (userId, message) => {
//   try {
//     // Fetch the user's FCM tokens from the database
//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       select: { fcmToken: true }, // fcmToken should be an array
//     });

//     if (!user || !user.fcmToken || user.fcmToken.length === 0) {
//       console.log("No FCM token found for this user.");
//       return;
//     }

//     // Prepare the notification payload
//     const payload = {
//       notification: {
//         title: message.title || "New Notification",
//         body: message.body || "You have a new message!",
//         click_action: message.clickAction || "OPEN_APP", // Optional
//       },
//       tokens: user.fcmToken, // Send to multiple tokens if array
//     };

//     // Send notification
//     const response = await admin.messaging().sendMulticast(payload);

//     console.log("Notification sent successfully:", response);
//     return response;
//   } catch (error) {
//     console.error("Error sending notification:", error);
//   }
// };





exports.sendNotification = async (userId, message) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user || !user.fcmToken) {
      console.log("No FCM token found for this user.");
      return;
    }

    const tokens = Array.isArray(user.fcmToken) ? user.fcmToken : [user.fcmToken];

    const payload = {
      notification: {
        title: message.title || "New Notification",
        body: message.body || "You have a new message!",
      },
    };

    const responses = await Promise.all(
      tokens.map(token => admin.messaging().send({ ...payload, token }))
    );

    console.log("Notifications sent:", responses.length);
    return responses;
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

