const Media = require("../models/media");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const uploadMedia = async (req, res) => {
  logger.info("Starting media upload");
  console.log(req.file, "req.fileReq.file");
  try {
    console.log(req.file, "req.fileReq.file");

    //check if the file is present or not
    if (!req.file) {
      logger.error("No file found, please try adding a file and try again!.");
      return res.status(400).json({
        success: false,
        message: "No file found, please try add a file and try again!.",
      });
    }
    console.log(req.file);

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(`file details : name ${originalname}, type=${mimetype}`);
    logger.info("Uploading to cloudinary starting...");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);

    logger.info(
      `Cloudinary upload successfull , public id - ${cloudinaryUploadResult.public_id}`
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId: userId,
    });

    await newlyCreatedMedia.save();

    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media upload is successfully",
    });
  } catch (error) {
    logger.error("error uoloading image", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
    });
  }
};

const getAllMedia = async (req, res) => {
  try {
    const results = await Media.find({});
    res.json({ results });
  } catch (error) {
    logger.error("error fetching media", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
    });
  }
};

module.exports = { uploadMedia, getAllMedia };
