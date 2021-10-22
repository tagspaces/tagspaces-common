const S3rver = require("s3rver");
let instance;

instance = new S3rver({
    port: 4569,
    address: "localhost",
    silent: false,
    directory: "./buckets",
}).run();


/*const corsConfig = require.resolve("s3rver/example/cors.xml");
  const websiteConfig = require.resolve("s3rver/example/website.xml");

  const s3rver = new S3rver({
    configureBuckets: [
      {
        name: "test-bucket",
        configs: [fs.readFileSync(corsConfig), fs.readFileSync(websiteConfig)],
      },
    ],
  });*/