import cloudinary from "../lib/cloudinary.js";

export const uploadToCloudinary = (buffer, folder = "shorts") => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    ).end(buffer);
  });
};