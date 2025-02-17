const userDto = (user) => {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        dob: user.dob,
        pronouns: user.pronouns,
        profileImage: user.profileImage,
        emailVerified: user.emailVerified,
        active: user.active,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};

module.exports = userDto;