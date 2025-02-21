const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

// Configure AWS SDK with access credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// Function to upload file to S3 with user-specific keys
const uploadToS3 = async (fileBuffer, fileName, folder) => {
  // Ensure unique file names by appending UUID
  const fileKey = `${folder}/${uuidv4()}-${fileName}`; 

  const s3Params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: "image/jpeg", // Change dynamically if needed
  };

  const data = await s3.upload(s3Params).promise();
  return data.Location; 
};

module.exports = { uploadToS3 };