const axios = require("axios");
require("dotenv").config();

// async function extractFilters(userQuery) {
//   const prompt = `
//   You are an AI that extracts structured filters from search queries based on these preference keys:
//   ["bio", "major", "college", "interests", "musicGenre", "zodiacSign", "socialLinks",
//    "collegeClubs", "favoriteShows", "graduatingYear", "favoriteArtists",
//    "favoritePlacesToGo", "relationshipStatus", "favoriteSportsTeams"]

//   The preferences can include nested objects like "interests.foodDrink", "interests.creativeArts", etc.

//   For negative queries (e.g., "do not like X"), use the $ne operator.

//   Example Queries and Filters:
//   1. "Show me people who like Taylor Swift"
//      → { "favoriteArtists": ["Taylor Swift"] }
//   2. "Show me people who do not like Drake"
//      → { "favoriteArtists": { "$ne": ["Drake"] } }
//   3. "People who love hip-hop music"
//      → { "musicGenre": "hip-hop" }
//   4. "People who do not watch Game of Thrones"
//      → { "favoriteShows": { "$ne": ["Game of Thrones"] } }
//   5. "People who go to Comsats"
//      → { "college": "Comsats" }
//   6. "People who enjoy cooking and crafts"
//      → { "interests.foodDrink": ["Cooking"], "interests.creativeArts": ["DIY/Crafts"] }

//   Now, extract structured filters for: "${userQuery}"
//   Return JSON only, without explanation.
//   `;

//   try {
//     const response = await axios.post(
//       "https://api.openai.com/v1/chat/completions",
//       {
//         model: "gpt-4",
//         messages: [{ role: "user", content: prompt }],
//         temperature: 0
//       },
//       { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
//     );

//     console.log('extracted filters for ', userQuery, 'are', response.data.choices[0].message.content);
    
//     return JSON.parse(response.data.choices[0].message.content);
//   } catch (error) {
//     console.error("Error fetching filters:", error.response?.data || error.message);
//     // Don't log API key in production!
//     // console.log('hello world', process.env.OPENAI_API_KEY);
//     return null;
//   }
// }


async function extractFilters(userQuery) {
   const prompt = `
 You are an AI that extracts structured filters from user search queries based on a given schema of user preferences.
 
 The available preference keys include:
 [
   "bio", "major", "college", "interests", "musicGenre", "zodiacSign", "socialLinks",
   "collegeClubs", "favoriteShows", "graduatingYear", "favoriteArtists",
   "favoritePlacesToGo", "relationshipStatus", "favoriteSportsTeams"
 ]
 
 Nested interest keys include:
 - interests.creativeArts: ["Art", "Photography", "Content Creation", "Movies", "Anime", "Reading", "Writing", "DIY/Crafts"]
 - interests.foodDrink: ["Cooking", "Foodie", "Coffee Enthusiast", "Wine Tasting", "Brunch Culture"]
 - interests.fitnessWellness: ["Fitness", "Yoga", "Hiking", "Swimming", "Tennis", "Volleyball", "Pickleball", "Church", "Dance"]
 - interests.sportsGaming: ["Basketball", "Baseball", "Hockey", "Football", "Soccer", "Wrestling", "Sports Betting", "Video Games"]
 - interests.lifestyleFashion: ["Streetwear", "Makeup", "Travel", "Astrology", "Thrifting"]
 - interests.outdoorAdventure: ["Snowboarding", "Skating", "Fishing", "Golf", "Hiking", "Camping"]
 - interests.nightlifeMusic: ["Live Music", "Bar Hopping", "Clubbing", "Festival Culture"]
 - interests.techDigital: ["Coding", "Crypto/NFTs", "Startups"]
 
 Allowed values for "collegeClubs" include:
 ["Phi Delta Theta", "Sigma Alpha Epsilon", "Kappa Alpha Order", "Delta Tau Delta", "Pi Kappa Alpha", "Alpha Phi Alpha", "Omega Psi Phi", "Beta Theta Pi", "Theta Chi", "Alpha Tau Omega", "Kappa Sigma", "Phi Gamma Delta", "Alpha Kappa Alpha", "Delta Sigma Theta", "Zeta Phi Beta", "Alpha Chi Omega", "Pi Beta Phi", "Kappa Alpha Theta", "Delta Delta Delta", "Gamma Phi Beta", "Chi Omega", "Alpha Phi", "Kappa Kappa Gamma", "Student Government Association", "Model United Nations", "College Democrats", "College Republicans", "Black Student Union", "LGBTQ+ Alliance", "Pre-Medical Society", "Pre-Dental Society", "Beta Alpha Psi", "Enactus", "American Society of Civil Engineers", "Asian Student Association", "Latinx Club", "Phi Beta Kappa", "Tau Beta Pi", "Theater Club", "A Cappella Group", "Dance Team", "Debate Team", "Speech Team", "History Club", "Philosophy Club", "Math Club", "Sigma Chi", "Students for Environmental Action", "Habitat for Humanity"]
 
 Instructions:
 - Parse the user query and return structured filters using only the valid values listed above.
 - Use the key names exactly as provided.
 - If a negative preference is mentioned (e.g., "do not like Drake"), use the $ne operator.
 - If no valid filters are found, return an empty JSON object: {}
 - Only include fields that are relevant to the query.
 - Do NOT include explanations — only return raw JSON.
 
 Now, extract structured filters for: "${userQuery}"
 
 Return a valid JSON object only.
   `;
 
   try {
     const response = await axios.post(
       "https://api.openai.com/v1/chat/completions",
       {
         model: "gpt-4",
         messages: [{ role: "user", content: prompt }],
         temperature: 0
       },
       { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
     );
 
     console.log('Extracted filters for', userQuery, 'are', response.data.choices[0].message.content);
 
     return JSON.parse(response.data.choices[0].message.content);
   } catch (error) {
     console.error("Error fetching filters:", error.response?.data || error.message);
     return null;
   }
 }

 // -------------home dashboard ai search filter code -----------------//


// async function extractSearchIntent (userQuery) {
//   const prompt = `
// You are an AI that extracts structured search intent from a user's query about events.

// Fields to extract:
// {
//   "keywords": string,
//   "city": string,
//   "segment": "Music" | "Sports" | "Arts & Theater" | "Film" | "Miscellaneous",
//   "genre": string,
//   "subGenre": string,
//   "type": string,
//   "subType": string,
//   "lat": number,
//   "long": number,
//   "radius": number
// }

// Instructions:
// - Extract keywords describing the event (e.g., "rock concert").
// - Identify city if mentioned.
// - Match category terms to segment/genre/subGenre if possible.
// - Leave lat/long null unless location is clearly specified.

// - If information is not provided, omit or set as empty string.

// User query: "${userQuery}"

// Return a JSON object only.
// `;

//   const response = await axios.post(
//     "https://api.openai.com/v1/chat/completions",
//     {
//       model: "gpt-4",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0,
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//         "Content-Type": "application/json",
//       },
//     }
//   );

//   const rawContent = response.data.choices[0].message.content.trim();

//   try {
//     const parsed = JSON.parse(rawContent);
//     return parsed;
//   } catch (err) {
//     console.error("Failed to parse OpenAI response:", rawContent);
//     return {}; // fallback
//   }
// };

async function extractSearchIntent(userQuery) {
  const prompt = `
You are an AI that extracts structured search intent from a user's query about events.

Fields to extract:
{
  "keywords": string,
  "city": string,
  "segment": "Music" | "Sports" | "Arts & Theater" | "Film" | "Miscellaneous",
  "genre": string,
  "subGenre": string,
  "type": string,
  "subType": string
}

Instructions:
- Extract keywords describing the event (e.g., "rock concert").
- Identify city if mentioned.
- Match category terms to segment/genre/subGenre if possible.
- Leave fields empty if not provided.

User query: "${userQuery}"

Return a JSON object only.
`;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const rawContent = response.data.choices[0].message.content.trim();

  try {
    const parsed = JSON.parse(rawContent);
    return parsed;
  } catch (err) {
    console.error("Failed to parse OpenAI response:", rawContent);
    return {};
  }
}


 
module.exports = {extractFilters, extractSearchIntent};