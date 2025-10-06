const Joi = require("joi");

const validateCreatePost = (data) => {
  const schema = Joi.object({
    content: Joi.string().min(3).max(5000).required(),
    mediaIds: Joi.array(),
  });

  //validate if the data passed matches the criteria in schema object created.
  return schema.validate(data);
};

module.exports = { validateCreatePost };
