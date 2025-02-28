
const calculateMatchPercentage = (currentUserPrefs, otherUserPrefs) => {
  let totalScore = 0;
  let maxPossibleScore = 0;

  // Weights for different categories (adjust as needed)
  const weights = {
    major: 15,
    college: 20,
    interests: 25,
    musicGenre: 10,
    zodiacSign: 5,
    collegeClubs: 10,
    favoriteShows: 5,
    favoriteArtists: 5,
    favoritePlacesToGo: 5,
    relationshipStatus: 0, // Not using for matching
    favoriteSportsTeams: 5,
  };

  // Calculate major match
  if (
    currentUserPrefs.major &&
    otherUserPrefs.major &&
    currentUserPrefs.major.toLowerCase() === otherUserPrefs.major.toLowerCase()
  ) {
    totalScore += weights.major;
  }
  maxPossibleScore += weights.major;

  // Calculate college match
  if (
    currentUserPrefs.college &&
    otherUserPrefs.college &&
    currentUserPrefs.college.toLowerCase() ===
      otherUserPrefs.college.toLowerCase()
  ) {
    totalScore += weights.college;
  }
  maxPossibleScore += weights.college;

  // Calculate interests match (considering the 3 category limit)
  if (currentUserPrefs.interests && otherUserPrefs.interests) {
    // Get categories that have items for current user
    const currentUserCategories = [];
    for (const category in currentUserPrefs.interests) {
      if (
        Array.isArray(currentUserPrefs.interests[category]) &&
        currentUserPrefs.interests[category].length > 0
      ) {
        currentUserCategories.push(category);
      }
    }

    // Get categories that have items for other user
    const otherUserCategories = [];
    for (const category in otherUserPrefs.interests) {
      if (
        Array.isArray(otherUserPrefs.interests[category]) &&
        otherUserPrefs.interests[category].length > 0
      ) {
        otherUserCategories.push(category);
      }
    }

    // Calculate overlap between categories
    const commonCategories = currentUserCategories.filter((cat) =>
      otherUserCategories.includes(cat)
    );
    const categoryMatchScore =
      (commonCategories.length /
        Math.max(1, Math.min(3, currentUserCategories.length))) *
      (weights.interests * 0.4);
    totalScore += categoryMatchScore;

    // Calculate specific interest matches within common categories
    let interestMatchScore = 0;
    for (const category of commonCategories) {
      const currentUserInterests = currentUserPrefs.interests[category] || [];
      const otherUserInterests = otherUserPrefs.interests[category] || [];

      const commonInterests = currentUserInterests.filter((interest) =>
        otherUserInterests.some(
          (i) => i.toLowerCase() === interest.toLowerCase()
        )
      );

      if (currentUserInterests.length > 0 && otherUserInterests.length > 0) {
        const categoryScore =
          (commonInterests.length /
            Math.max(
              1,
              Math.min(currentUserInterests.length, otherUserInterests.length)
            )) *
          ((weights.interests * 0.6) / Math.max(1, commonCategories.length));
        interestMatchScore += categoryScore;
      }
    }

    totalScore += interestMatchScore;
  }
  maxPossibleScore += weights.interests;

  // Calculate music genre match
  if (
    currentUserPrefs.musicGenre &&
    otherUserPrefs.musicGenre &&
    currentUserPrefs.musicGenre.toLowerCase() ===
      otherUserPrefs.musicGenre.toLowerCase()
  ) {
    totalScore += weights.musicGenre;
  }
  maxPossibleScore += weights.musicGenre;

  // Calculate zodiac sign match
  if (
    currentUserPrefs.zodiacSign &&
    otherUserPrefs.zodiacSign &&
    currentUserPrefs.zodiacSign.toLowerCase() ===
      otherUserPrefs.zodiacSign.toLowerCase()
  ) {
    totalScore += weights.zodiacSign;
  }
  maxPossibleScore += weights.zodiacSign;

  // Calculate college clubs match
  if (
    currentUserPrefs.collegeClubs &&
    otherUserPrefs.collegeClubs &&
    currentUserPrefs.collegeClubs.length > 0 &&
    otherUserPrefs.collegeClubs.length > 0
  ) {
    const commonClubs = currentUserPrefs.collegeClubs.filter((club) =>
      otherUserPrefs.collegeClubs.some(
        (c) => c.toLowerCase() === club.toLowerCase()
      )
    );

    const clubMatchScore =
      (commonClubs.length /
        Math.max(
          1,
          Math.min(
            currentUserPrefs.collegeClubs.length,
            otherUserPrefs.collegeClubs.length
          )
        )) *
      weights.collegeClubs;
    totalScore += clubMatchScore;
  }
  maxPossibleScore += weights.collegeClubs;

  // Calculate favorite shows match
  if (
    currentUserPrefs.favoriteShows &&
    otherUserPrefs.favoriteShows &&
    currentUserPrefs.favoriteShows.length > 0 &&
    otherUserPrefs.favoriteShows.length > 0
  ) {
    const commonShows = currentUserPrefs.favoriteShows.filter((show) =>
      otherUserPrefs.favoriteShows.some(
        (s) => s.toLowerCase() === show.toLowerCase()
      )
    );

    const showMatchScore =
      (commonShows.length /
        Math.max(
          1,
          Math.min(
            currentUserPrefs.favoriteShows.length,
            otherUserPrefs.favoriteShows.length
          )
        )) *
      weights.favoriteShows;
    totalScore += showMatchScore;
  }
  maxPossibleScore += weights.favoriteShows;

  // Calculate favorite artists match
  if (
    currentUserPrefs.favoriteArtists &&
    otherUserPrefs.favoriteArtists &&
    currentUserPrefs.favoriteArtists.length > 0 &&
    otherUserPrefs.favoriteArtists.length > 0
  ) {
    const commonArtists = currentUserPrefs.favoriteArtists.filter((artist) =>
      otherUserPrefs.favoriteArtists.some(
        (a) => a.toLowerCase() === artist.toLowerCase()
      )
    );

    const artistMatchScore =
      (commonArtists.length /
        Math.max(
          1,
          Math.min(
            currentUserPrefs.favoriteArtists.length,
            otherUserPrefs.favoriteArtists.length
          )
        )) *
      weights.favoriteArtists;
    totalScore += artistMatchScore;
  }
  maxPossibleScore += weights.favoriteArtists;

  // Calculate favorite places match
  if (
    currentUserPrefs.favoritePlacesToGo &&
    otherUserPrefs.favoritePlacesToGo &&
    currentUserPrefs.favoritePlacesToGo.length > 0 &&
    otherUserPrefs.favoritePlacesToGo.length > 0
  ) {
    const commonPlaces = currentUserPrefs.favoritePlacesToGo.filter((place) =>
      otherUserPrefs.favoritePlacesToGo.some(
        (p) => p.toLowerCase() === place.toLowerCase()
      )
    );

    const placeMatchScore =
      (commonPlaces.length /
        Math.max(
          1,
          Math.min(
            currentUserPrefs.favoritePlacesToGo.length,
            otherUserPrefs.favoritePlacesToGo.length
          )
        )) *
      weights.favoritePlacesToGo;
    totalScore += placeMatchScore;
  }
  maxPossibleScore += weights.favoritePlacesToGo;

  // Calculate favorite sports teams match
  if (
    currentUserPrefs.favoriteSportsTeams &&
    otherUserPrefs.favoriteSportsTeams &&
    currentUserPrefs.favoriteSportsTeams.length > 0 &&
    otherUserPrefs.favoriteSportsTeams.length > 0
  ) {
    const commonTeams = currentUserPrefs.favoriteSportsTeams.filter((team) =>
      otherUserPrefs.favoriteSportsTeams.some(
        (t) => t.toLowerCase() === team.toLowerCase()
      )
    );

    const teamMatchScore =
      (commonTeams.length /
        Math.max(
          1,
          Math.min(
            currentUserPrefs.favoriteSportsTeams.length,
            otherUserPrefs.favoriteSportsTeams.length
          )
        )) *
      weights.favoriteSportsTeams;
    totalScore += teamMatchScore;
  }
  maxPossibleScore += weights.favoriteSportsTeams;

  // Calculate final percentage
  return Math.round((totalScore / maxPossibleScore) * 100);
};


module.exports = { calculateMatchPercentage };