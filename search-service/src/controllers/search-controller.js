const Search = require("../models/Search");
const logger = require("../utils/logger");

const searchPostController = async (req, res) => {
  logger.info("Search endpoint hit...");
  try {
    const { query } = req.query;
    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" }, // adds a new filed score to the result document, the value of score is how relevant the document is to the query.
      }
    )
      .sort({ score: { $meta: "textScore" } }) // sort it based on the score
      .limit(10);

    res.json(results);
  } catch (error) {
    logger.error("Error while searching post", error);
    res.json(500).status({
      success: false,
      message: "Error while searching post",
    });
  }
};

module.exports = { searchPostController };
