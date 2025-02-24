exports.normalizePreferences = (req, res, next) => {
    if (req.body.preferences && typeof req.body.preferences === "object") {
        Object.keys(req.body.preferences).forEach((key) => {
            if (Array.isArray(req.body.preferences[key])) {
                // ✅ Keep empty arrays as []
                if (!req.body.preferences[key]) {
                    req.body.preferences[key] = [];
                }
            } else if (typeof req.body.preferences[key] === "string") {
                // ✅ Keep empty strings as ""
                req.body.preferences[key] = req.body.preferences[key].trim();
            } else if (key === "graduatingYear") {
                // ✅ Ensure graduatingYear is a number or null
                const value = req.body.preferences[key];
                req.body.preferences[key] =
                    value && !isNaN(value) ? parseInt(value) : null;
            }
        });
    }
    next();
};