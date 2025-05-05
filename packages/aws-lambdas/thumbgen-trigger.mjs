/**
 {
  "Records": [{
    "s3": {
      "bucket":{"name":"test-bucket-ddd"},
      "object": {
          "key": "polar.jpeg",
          "size": 12345
        }
    },
    "eventName": "ObjectCreated:Put",
    "eventTime": 1746185835
  }]
}
 */

import { generateThumbnail, removeThumbnail } from "@tagspaces/aws-thumbgen";

export const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const bucketName = event.Records[0].s3.bucket.name;
  const { key, size } = event.Records[0].s3.object;
  const { eventName, eventTime } = event.Records[0];
  let thumbPath = "";

  const response = {
    statusCode: 200,
    body: "starting " + eventName,
  };

  try {
    if (eventName === "ObjectRemoved:Delete") {
      await removeThumbnail(bucketName, key);
    } else if (eventName === "ObjectCreated:Put") {
      response.body += "generating Thumbnail..";
      thumbPath = await generateThumbnail(bucketName, key);
      response.body += " generateThumbnail thumbPath: " + thumbPath;
    }
  } catch (err) {
    console.log(err);
    response.statusCode = 400;
    response.body += err.message;
  }

  return response;
};
