const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser"); // Add this line
const { v4: uuidv4 } = require("uuid"); // Import uuid

const databasePath = path.join(__dirname, "nxtwatch.db");

const app = express();

app.use(express.json());
app.use(cors({ origin: 'https://cookie-frontend.onrender.com', credentials: true, }));
app.use(cookieParser()); // Add this line
app.use(express.urlencoded({ extended: true }));

let database = null;

// In-memory store for sessions (for demonstration purposes)
const sessionStore = {};

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

function generateSessionId() {
  return uuidv4();
}

function saveSessionId(username, sessionId) {
  sessionStore[username] = sessionId;
  console.log(sessionStore, username, sessionId, "savinggggg.")
}

function checkSessionId(username, sessionId) {
  console.log(sessionStore, "sgaga")
  return sessionStore[username] === sessionId;
}

// Verify token middleware
function authenticateToken(request, response, next) {
  const jwtToken = request.cookies.jwt_token;
  const sessionId = request.cookies.session_id;
  console.log(jwtToken, sessionId)
  if (!jwtToken || !sessionId) {
    return response.status(401).send("Invalid session");
  }

  jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
    if (error) {
      return response.status(401).send("Invalid JWT Token");
    }

    const isValidSession = checkSessionId(payload.username, sessionId);
    console.log(isValidSession)
    if (!isValidSession) {
      return response.status(401).send("Invalid session");
    }

    request.user = payload;
    next();
  });
}

const activeSessions = {}; // This should be replaced with a real session store

const authenticate = (req, res, next) => {
  const sessionId = req.cookies.session_id;

  if (!sessionId || !checkSessionId(req.user.username, sessionId)) {
    return res.status(401).json({ error: 'Invalid session' }); // Unauthorized
  }

  req.user = req.cookies.jwt_token; // Attach user data to the request
  next();
};


// Register user
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
    response.status(400).send("User already exists");
  }
});

// Login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    response.status(400).send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched) {
      const payload = { username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");

      // Generate a session ID
      const sessionId = generateSessionId();

      // Save session ID
      saveSessionId(username, sessionId);

      // Set session ID and JWT token as cookies
      console.log(sessionId, jwtToken)
      response.cookie("session_id", sessionId, { httpOnly: true, secure: true });
      response.cookie("jwt_token", jwtToken, { httpOnly: true, secure: true });
      console.log(sessionId, sessionStore)
      response.json({ jwt_token: jwtToken, session_id: sessionId, });
    } else {
      response.status(400).send("Invalid password");
    }
  }
});

module.exports = app;

// // API route to get home videos
// app.get("/all", authenticateToken, async (request, response) => {
//   const { search = "" } = request.query;
//   const homeSqlQuery = `SELECT * FROM home_videos WHERE title LIKE '%${search}%';`;
//   const homeVideos = await database.all(homeSqlQuery);
//   const data = homeVideos.map((eachVideo) => ({
//     id: eachVideo.id,
//     title: eachVideo.title,
//     view_count: eachVideo.view_count,
//     published_at: eachVideo.published_at,
//     thumbnail_url: eachVideo.thumbnail_url,
//     channel: {
//       name: eachVideo.channel_name,
//       profile_image_url: eachVideo.channel_profile_image_url,
//     },
//   }));

//   response.send({ videos: data });
// });

// // Other API routes...

// API route to get home videos
app.get("/all", authenticateToken, async (request, response) => {
  console.log("sa")
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
  const videoSQLQuery = `select * from video_details where id = '${id}';`
  const videoDetails = await database.get(videoSQLQuery);
  const data = {
    id: videoDetails.id,
    title: videoDetails.title,
    video_url: videoDetails.video_url,
    thumbnail_url: videoDetails.thumbnail_url,
    channel: {
      name: videoDetails.channel_name,
      profile_image_url: videoDetails.profile_image_url,
      subscriber_count: videoDetails.subscriber_count
    },
    view_count: videoDetails.view_count,
    published_at: videoDetails.published_at,
    description: videoDetails.description
  };

  response.send({ video_details: data });
});
