const getDefaultPreferences = () => ({
    bio: "",
    major: "",
    college: "",
    interests: {
        techDigital: [],
        creativeArts: [],
        sportsGaming: [],
        foodDrink: [],
        fitnessWellness: [],
        lifestyleFashion: [],
        outdoorAdventure: [],
        nightlifeMusic: [],
        techDigital: []
    },
    musicGenre: "",
    zodiacSign: "",
    socialLinks: {
        facebook: "",
        instagram: "",
        snapchat: "",
        twitter: "",
        linkedin : "",
    },
    collegeClubs: [],
    favoriteShows: [],
    graduatingYear: null,
    favoriteArtists: [],
    favoritePlacesToGo: [],
    relationshipStatus: "",
    favoriteSportsTeams: []
});

module.exports = { getDefaultPreferences };