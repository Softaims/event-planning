const getDefaultPreferences = () => ({
    bio: "",
    major: "",
    college: "",
    interests: {
        techDigital: [],
        creativeArts: [],
        sportsGaming: []
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