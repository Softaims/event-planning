const parseJSONFields = (fields) => (req, res, next) => {
  try {
    fields.forEach((field) => {
      if (req.body[field]) {
        req.body[field] = JSON.parse(req.body[field]);
      }
    });
    next();
  } catch (error) {
    return res
      .status(400)
      .json({ error: `Invalid JSON format in ${fields.join(", ")}` });
  }
};

module.exports = parseJSONFields;
