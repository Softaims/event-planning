const axios = require("axios");
require("dotenv").config();
const stringSimilarity = require("string-similarity");
const path = require("path");
const fs = require("fs");
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

// async function extractSearchIntent(userQuery) {
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
//   "subType": string
// }

// Instructions:
// - Extract keywords describing the event (e.g., "rock concert").
// - Identify city if mentioned.
// - Match category terms to segment/genre/subGenre if possible.
// - Leave fields empty if not provided.

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
//     return {};
//   }
// }



// Old function which is currently live till 09 may 2025
async function extractSearchIntent(userQuery) {
  const prompt = `
You are an intelligent assistant that extracts structured search intent from casual, conversational user queries about **events in the USA**.

Your task is to return a **JSON object** with the following fields, based on the user's query:

{
  "keywords": string,          // Key phrase(s) that describe the event (e.g., "Taylor Swift concert", "rock festival")
  "city": string,              // U.S. city mentioned in the query (e.g., "New York", "Los Angeles"). Leave blank if unspecified.
  "segment": string,           // One of: "Music", "Sports", "Arts & Theater", "Film", "Miscellaneous"
  "genre": string,             // Genre under the segment, like "Pop", "Rock", "Basketball", "Comedy", etc.
  "subGenre": string,          // More specific genre information, if available
  "type": string,              // High-level event type like "Concert", "Match", "Show", "Exhibition"
  "subType": string            // More specific type if available, like "Stand-up", "Open Mic", "Broadway"
}

### Guidelines:
- Do not correct or comment on user spelling; interpret the intent as accurately as possible,
- If the user says "near me", infer that the city is not provided; leave the 'city' field empty,
- Always extract the most meaningful **keywords** for searching (e.g., if user says "Taylor Swift ,event", keyword is "Taylor Swift").
- Match known categories to the appropriate 'segment', 'genre', 'subGenre', etc.
- Leave a field empty if the information is not available in the query.

### Examples of user queries:
1. "Concert near me" → keywords: "concert", city: "", segment: "Music", type: "Concert"
2. "Pop concert in Washington DC" → keywords: "pop concert", city: "Washington DC", segment: "Music", genre: "Pop"
3. "Find the non-alcoholic event near me" → keywords: "non-alcoholic event", segment: "Miscellaneous"
4. "Taylor Swift event in New York" → keywords: "Taylor Swift", city: "New York", segment: "Music", genre: "Pop", type: "Concert"
5. "Most famous events near me" → keywords: "famous events"

User query: """${userQuery}"""

Only return the JSON object. Do not include any explanation or commentary.
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
    return JSON.parse(rawContent);
  } catch (err) {
    console.error("Failed to parse OpenAI response:", rawContent);
    return {};
  }
}



// this function include the functionality of question list data.

const questionList = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../questionList.json"), "utf8")
);

async function extractSearchIntent1(userQuery) {
  // Find best match from question list
  const samplePrompts = questionList.map((q) => q["Sample Prompt"]);
  const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(userQuery, samplePrompts);
  const matched = questionList[bestMatchIndex];

  const prompt = `
You are an intelligent assistant that extracts structured search intent from casual, conversational user queries about **events in the USA**.

Your task is to return a **JSON object** with the following fields, based on the user's query:

{
  "keywords": string,          
  "city": string,              
  "segment": string,           
  "genre": string,             
  "subGenre": string,          
  "type": string,              
  "subType": string            
}

Use the genre and subGenre from this matched reference if appropriate:
Reference Genre: "${matched.Genre}"
Reference SubGenre: "${matched.Subgenre}"

If the genre/subgenre from the query matches this reference, use it directly. Otherwise, infer based on context.

User query: """${userQuery}"""

Only return the JSON object. Do not include any explanation or commentary.
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

   const usage = response.data.usage;

  
  try {
    return JSON.parse(rawContent);
  } catch (err) {
    console.error("Failed to parse OpenAI response:", rawContent);
    return {};
  }
}


// this function give include both question and classification list 
const classificationList = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../classifications.json"), "utf8")
);


async function extractSearchIntentWithClassification(userQuery) {
  // Step 1: Match best prompt
  const samplePrompts = questionList.map((q) => q["Sample Prompt"]);
  const { bestMatchIndex } = stringSimilarity.findBestMatch(userQuery, samplePrompts);
  const matched = questionList[bestMatchIndex];

  const matchedGenre = matched.Genre || "";
  const matchedSubgenre = matched.Subgenre || "";
  console.log(matchedGenre,matchedSubgenre, 'prompts')

  // Step 2: Find corresponding entry in classification.json
  const classificationMatch = classificationList.find(
    (entry) =>
      entry.genre_name.toLowerCase() === matchedGenre.toLowerCase() &&
      entry.subgenre_name.toLowerCase() === matchedSubgenre.toLowerCase()
  );

  console.log(classificationMatch, 'match')
  // Step 3: Extract IDs if match found
  const segmentId = classificationMatch?.segment_id || "";
  const genreId = classificationMatch?.genre_id || "";
  const subgenreId = classificationMatch?.subgenre_id || "";

  console.log(segmentId,genreId,subgenreId, 'match')


  const prompt = `
You are an intelligent assistant that extracts structured search intent from casual, conversational user queries about **events in the USA**.

Your task is to return a **JSON object** with the following fields, based on the user's query:

{
  "keywords": string,          
  "city": string,              
  "segment": string,           
  "genre": string,             
  "subGenre": string,          
  "type": string,              
  "subType": string,
  "segment_id": string,
  "genre_id": string,
  "subgenre_id": string
}

Use the genre and subGenre from this matched reference if appropriate:
Reference Genre: "${matchedGenre}"
Reference SubGenre: "${matchedSubgenre}"

Matched Segment ID: "${segmentId}"
Matched Genre ID: "${genreId}"
Matched SubGenre ID: "${subgenreId}"

If the genre/subgenre from the query matches this reference, use it directly. Otherwise, infer based on context.

User query: """${userQuery}"""

Only return the JSON object. Do not include any explanation or commentary.
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

  const usage = response.data.usage;
   console.log(usage, 'usage')
  console.log("Input Tokens:", usage.prompt_tokens);
  console.log("Output Tokens:", usage.completion_tokens);
  console.log("Total Tokens:", usage.total_tokens);


  try {
    return JSON.parse(rawContent);
  } catch (err) {
    console.error("Failed to parse OpenAI response:", rawContent);
    return {};
  }
}
 
module.exports = {extractFilters, extractSearchIntent,extractSearchIntent1,extractSearchIntentWithClassification };