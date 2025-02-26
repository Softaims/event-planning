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
        Facebook: "",
        Instagram: ""
    },
    collegeClubs: [],
    favoriteShows: [],
    graduatingYear: null,
    favoriteArtists: [],
    favoritePlacesToGo: [],
    relationshipStatus: "",
    favoriteSportsTeams: [] // Now a single array
});

module.exports = { getDefaultPreferences };