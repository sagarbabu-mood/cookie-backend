const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "nxtwatch.db");

const app = express();

app.use(express.json());
app.use(cors());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3019, () =>
      console.log("Server Running at http://localhost:3019/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

// Verify token middleware
function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

//Register user
app.post("/register", async (request, response) => {
  const { username, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
        INSERT INTO user (username, password)
        VALUES ( ?, ?);
    `;

    await database.run(createUserQuery, [username, hashedPassword]);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//Login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwt_token: jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

module.exports = app;

// API route to get home videos
app.get("/all", authenticateToken, async (request, response) => {
  const { search = "" } = request.query;
  const homeSqlQuery = `SELECT * FROM home_videos WHERE title LIKE '%${search}%';`;
  const homeVideos = await database.all(homeSqlQuery);
  const data = homeVideos.map((eachVideo) => ({
    id: eachVideo.id,
    title: eachVideo.title,
    view_count: eachVideo.view_count,
    published_at: eachVideo.published_at,
    thumbnail_url: eachVideo.thumbnail_url,
    channel: {
      name: eachVideo.channel_name,
      profile_image_url: eachVideo.channel_profile_image_url,
    },
  }));

  response.send({ videos: data });
});

// API route to get trending videos
app.get("/trending", authenticateToken, async (request, response) => {
  const trendingSqlQuery = `SELECT * FROM trending_videos`;
  const trendingVideos = await database.all(trendingSqlQuery);
  const data = trendingVideos.map((eachVideo) => ({
    id: eachVideo.id,
    title: eachVideo.title,
    view_count: eachVideo.view_count,
    published_at: eachVideo.published_at,
    thumbnail_url: eachVideo.thumbnail_url,
    channel: {
      name: eachVideo.channel_name,
      profile_image_url: eachVideo.channel_profile_image_url,
    },
  }));
  response.send({ videos: data });
});

// API route to get gaming videos
app.get("/gaming", authenticateToken, async (request, response) => {
  const gamingSqlQuery = `SELECT * FROM gaming_videos`;
  const gamingVideos = await database.all(gamingSqlQuery);
  response.send({ videos: gamingVideos });
});

app.get("/videos/:id", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const videoSQLQuery = `SELECT 'home_videos' AS video_type, id, title, view_count, published_at, thumbnail_url, channel_name AS channel, channel_profile_image_url AS profile_image_url
FROM home_videos
WHERE id = '${id}'

UNION ALL

SELECT 'trending_videos' AS video_type, id, title, view_count, published_at, thumbnail_url, channel_name AS channel, channel_profile_image_url AS profile_image_url
FROM trending_videos
WHERE id = '${id}'

UNION ALL

SELECT 'gaming_videos' AS video_type, id, title, view_count, published_at, thumbnail_url, channel_name AS channel, channel_profile_image_url AS profile_image_url
FROM gaming_videos
WHERE id = '${id}';
`;
  const videoDetails = await database.get(videoSQLQuery);
  response.send({ video_details: videoDetails });
});
