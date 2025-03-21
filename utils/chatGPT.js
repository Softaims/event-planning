const axios = require("axios");
require("dotenv").config();

async function extractFilters(userQuery) {
  const prompt = `
  You are an AI that extracts structured filters from search queries based on these preference keys:
  ["bio", "major", "college", "interests", "musicGenre", "zodiacSign", "socialLinks",
   "collegeClubs", "favoriteShows", "graduatingYear", "favoriteArtists",
   "favoritePlacesToGo", "relationshipStatus", "favoriteSportsTeams"]

  The preferences can include nested objects like "interests.foodDrink", "interests.creativeArts", etc.

  For negative queries (e.g., "do not like X"), use the $ne operator.

  Example Queries and Filters:
  1. "Show me people who like Taylor Swift"
     → { "favoriteArtists": ["Taylor Swift"] }
  2. "Show me people who do not like Drake"
     → { "favoriteArtists": { "$ne": ["Drake"] } }
  3. "People who love hip-hop music"
     → { "musicGenre": "hip-hop" }
  4. "People who do not watch Game of Thrones"
     → { "favoriteShows": { "$ne": ["Game of Thrones"] } }
  5. "People who go to Comsats"
     → { "college": "Comsats" }
  6. "People who enjoy cooking and crafts"
     → { "interests.foodDrink": ["Cooking"], "interests.creativeArts": ["DIY/Crafts"] }

  Now, extract structured filters for: "${userQuery}"
  Return JSON only, without explanation.
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

    console.log('extracted filters for ', userQuery, 'are', response.data.choices[0].message.content);
    
    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error("Error fetching filters:", error.response?.data || error.message);
    // Don't log API key in production!
    // console.log('hello world', process.env.OPENAI_API_KEY);
    return null;
  }
}

module.exports = extractFilters;