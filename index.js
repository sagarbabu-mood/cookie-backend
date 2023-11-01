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
const data = [
  {
    "id": "30b642bd-7591-49f4-ac30-5c538f975b15",
    "title": "Sehwag shares his batting experience in iB Cricket | iB Cricket Super Over League",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-1-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "1.4K",
    "published_at": "Apr 19, 2019"
  },
  {
    "id": "606f5b7b-9208-4eb2-a68c-1eb5faef4268",
    "title": "Yellow Strikers are Ready to Strike Big | Watch it on Viu | iB Cricket Super Over League",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-2-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "2K",
    "published_at": "Mar 14, 2019"
  },
  {
    "id": "2fd4fa94-f8a1-4508-87e9-7cdd279c4a1f",
    "title": "Blue Blasters are ready | iB Cricket Super Over League | watch it on Viu",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-3-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "2.1K",
    "published_at": "Mar 14, 2019"
  },
  {
    "id": "6114fac6-44ff-47f8-82df-3426715e0b56",
    "title": "Sam Billings having fun with Virtual Reality Cricket",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-4-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "3.6K",
    "published_at": "Jan 30, 2019"
  },
  {
    "id": "51b73ec6-7cdb-4e6f-b290-868387ada97a",
    "title": "Stephen Fleming takes on Morne Morkel in VR Cricket",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-5-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "3.2K",
    "published_at": "Jan 23, 2019"
  },
  {
    "id": "420f102e-1734-4468-8d3c-797134c505b0",
    "title": "Best of Virender Sehwag in iB Cricket Super Over League",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-6-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "2.3K",
    "published_at": "Jun 27, 2019"
  },
  {
    "id": "f1c2182d-568c-47de-89ff-fd612f0bd99d",
    "title": "Best of Suresh Raina in iB Cricket Super Over League",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-7-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "2.9K",
    "published_at": "Jun 27, 2019"
  },
  {
    "id": "72274854-be1c-4ffd-9788-1e5d3c2d600c",
    "title": "Best of VVS Laxman in iB Cricket Super Over League",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-8-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "1K",
    "published_at": "Jun 27, 2019"
  },
  {
    "id": "10dcb8df-11b3-4f70-9690-4a8929b89816",
    "title": "Best of Prithvi Shaw in iB Cricket Super Over League",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-9-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "1.1K",
    "published_at": "Jun 27, 2019"
  },
  {
    "id": "66b857d7-9c62-496e-8404-88a6a1ccc295",
    "title": "Best of Mohammad Kaif in iB Cricket Super Over League",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-10-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "45K",
    "published_at": "Jun 27, 2019"
  },
  {
    "id": "c965db6b-5e7f-4541-8412-e4e7e7912399",
    "title": "Best of Brendon McCullum in iB Cricket Super Over League",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-11-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "1.6K",
    "published_at": "Jun 27, 2019"
  },
  {
    "id": "7650d552-1d4a-40e4-bcf8-1c13d78b38c1",
    "title": "Best of Andre Russell in iB Cricket Super Over League",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-12-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "1.4K",
    "published_at": "Jun 27, 2019"
  },
  {
    "id": "7f280933-f36b-4d2f-8f4f-b31b089c8f78",
    "title": "Best of Chris Lynn in iB Cricket Super Over League",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-13-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "675",
    "published_at": "Jun 27, 2019"
  },
  {
    "id": "268f94b2-ed0c-4f49-a743-0de35d1f2294",
    "title": "iB Cricket winning hearts across the world | Virtual Reality Cricket",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-14-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "5.4K",
    "published_at": "Jun 1, 2019"
  },
  {
    "id": "2c79fe02-67b8-45f7-b835-aa4971f5c4df",
    "title": "iB Cricket | The World's Most Immersive Virtual Reality Cricket",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-15-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "8.6K",
    "published_at": "Jan 31, 2019"
  },
  {
    "id": "2ebc17f9-fba5-4b24-9f5e-7e12137bb902",
    "title": "Fans playing with Rajasthan Royals stars | RR - iB Cricket Fan Tour | Rahane, Unadkat, Smith, Butler",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-fans-tour-3-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "2.5K",
    "published_at": "May 27, 2019"
  },
  {
    "id": "a25b246c-5b18-44dc-a832-6007c06397af",
    "title": "iB Cricket - A New Format of Cricket in Virtual Reality",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-vsport-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "21K",
    "published_at": "Feb 27, 2018"
  },
  {
    "id": "9a4d9c25-34af-44c8-898e-6bc4ba6c24a4",
    "title": "Fans playing cricket with CSK Stars | CSK - iB Cricket Fan Tour | MS Dhoni, Raina, Jadeja, Watson",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-fans-tour-2-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "6.2K",
    "published_at": "May 11, 2019"
  },
  {
    "id": "a294b662-2ae5-408d-93b1-7c8dbe4412fb",
    "title": "A ROYAL evening for RR stars with iB Cricket | Ajinkya Rahane, Sanju Samson, Jaydev Unadkat.",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-fans-tour-1-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "3.9K",
    "published_at": "May 9, 2019"
  },
  {
    "id": "5d7c6c4d-6ab2-48f4-af2d-5c6846180cc7",
    "title": "Mohammad Kaif and Brendon McCullum on fielding in iB Cricket | iB Cricket Super Over League",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-16-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "1.9K",
    "published_at": "Apr 19, 2019"
  },
  {
    "id": "1f44125f-eeb0-40a7-a2bf-3c8f64e5a17a",
    "title": "iB Cricket Super Over League Official Announcement | World’s First Virtual Reality Cricket League",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-announce-1-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "30K",
    "published_at": "Feb 21, 2019"
  },
  {
    "id": "8d308548-9496-448a-b10f-70b173f87e68",
    "title": "Play 360 degrees in iB Cricket - World's Most Immersive VR Cricket",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-announce-2-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "231",
    "published_at": "Aug 2, 2021"
  },
  {
    "id": "e2df788b-ae68-465c-8a3c-b5701d3f9c5b",
    "title": "Announcing iB Cricket Home Edition",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-announce-1-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "287",
    "published_at": "Jul 27, 2021"
  },
  {
    "id": "beb03ef7-d8dc-4654-bf3f-fbbcc8523966",
    "title": "iB Cricket - World's most immersive VR Cricket",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-vsport-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "427",
    "published_at": "Jul 24, 2021"
  },
  {
    "id": "716142b5-fc5c-4a10-b29d-cb746258161c",
    "title": "iB Cricket Gameplay!! Numerous bowling styles, realistic animations, massive shots & more..",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-sol-17-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "701",
    "published_at": "Apr 16, 2021"
  },
  {
    "id": "1cc3a158-6751-4a39-ae6f-c63a72108f12",
    "title": "Me, Dad & Cricket || Happy Father's Day 2020",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-announce-1-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "1.4K",
    "published_at": "Jun 21, 2020"
  },
  {
    "id": "e5cb5fc4-102a-4a8a-a8d7-f19a5b11fa7b",
    "title": "Indian Moms and Cricket | Their Advice to Kids",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-mothersday-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "583",
    "published_at": "May 10, 2020"
  },
  {
    "id": "e1e964ef-e0d0-44ac-8797-28832ce64e23",
    "title": "iB Cricket energizing corporate employees across the world",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-corporates-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "1.9K",
    "published_at": "Mar 11, 2020"
  },
  {
    "id": "616c16fe-b98a-4397-9a59-74cdd7b9bfb7",
    "title": "iB Cricket - IPL Fan Tours mesmerized cricket fans across India | RCB, CSK, KKR, RR and DC",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-fans-tour-4-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "5.7K",
    "published_at": "Jul 1, 2019"
  },
  {
    "id": "82832be4-a4d0-4613-bf9a-3a0bb3bf7bab",
    "title": "Fans playing with RCB stars in iB Cricket | RCB - iB Cricket Fan Tour | Virat Kohli, Ab De Villers",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibc-fans-tour-5-img.png",
    "channel": {
      "name": "iB Cricket",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-cricket-img.png"
    },
    "view_count": "3.4K",
    "published_at": "Jun 1, 2019"
  },
  {
    "id": "ad9822d2-5763-41d9-adaf-baf9da3fd490",
    "title": "iB Hubs Announcement Event",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibhubs-img.png",
    "channel": {
      "name": "iB Hubs",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-hubs-img.png"
    },
    "view_count": "26K",
    "published_at": "Nov 29, 2016"
  },
  {
    "id": "89383330-f76c-4ca4-b13b-9b3e9bf8a808",
    "title": "A welcoming interaction with Hyderabad startup community : iB Hubs",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibhubs-startup-img.png",
    "channel": {
      "name": "iB Hubs",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-hubs-img.png"
    },
    "view_count": "9.6K",
    "published_at": "Sep 22, 2016"
  },
  {
    "id": "f3da2507-4ff5-41d0-b6d7-e796df01de25",
    "title": "iB Group Vision | Transforming India - From a Land of Potential to a Land of Opportunity",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibhubs-thumbnail-img.png",
    "channel": {
      "name": "iB Hubs",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-hubs-img.png"
    },
    "view_count": "13.5K",
    "published_at": "Jan 22, 2018"
  },
  {
    "id": "8329b21b-44f2-4229-b4b0-4b7311513526",
    "title": "Social Entrepreneurship - A Practitioner's view Satish Burra",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibhubs-talk-img.png",
    "channel": {
      "name": "iB Hubs",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-hubs-img.png"
    },
    "view_count": "2.4K",
    "published_at": "Nov 3, 2016"
  },
  {
    "id": "8884c12a-96f7-4f64-843d-d3ecde8eeb4f",
    "title": "iB Hubs IoT Bootcamp | End-to-End training in IoT with AR/VR - Blockchain - Security integrations",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibhubs-iot-img.png",
    "channel": {
      "name": "iB Hubs",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-hubs-img.png"
    },
    "view_count": "8.9K",
    "published_at": "Jul 30, 2017"
  },
  {
    "id": "f3dc2b15-7c71-4ddb-94f1-3f2c86f9751f",
    "title": "iB Hubs Super 30 Aftermovie | Honouring Teachers Across India | Teachers Day",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibhubs-super-30-1-img.png",
    "channel": {
      "name": "iB Hubs",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-hubs-img.png"
    },
    "view_count": "6.9K",
    "published_at": "Sep 5, 2020"
  },
  {
    "id": "4b42d8a0-5a9d-499e-bfca-f8a68f6d3bf6",
    "title": "iB Hubs Super 30 - Grand Felicitation - Mr. Nurul Islam",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibhubs-super-30-islam-img.png",
    "channel": {
      "name": "iB Hubs",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-hubs-img.png"
    },
    "view_count": "15.7K",
    "published_at": "Oct 25, 2019"
  },
  {
    "id": "ea0a9be4-d94a-41db-82bf-044d8915d6cf",
    "title": "Innovation drives India into future - says Shri Amitabh Kant",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibhubs-talks-2-img.png",
    "channel": {
      "name": "iB Hubs",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-hubs-img.png"
    },
    "view_count": "2.4K",
    "published_at": "Nov 16, 201"
  },
  {
    "id": "018f8cbf-ecc6-403b-96c5-b15736328818",
    "title": "iB Hubs Startup School - Student Acceleration Program | Future Begins Here | 2021 Edition",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibhubs-student-startup-img.png",
    "channel": {
      "name": "iB Hubs",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-hubs-img.png"
    },
    "view_count": "2.8K",
    "published_at": "Apr 7, 2021"
  },
  {
    "id": "d54bee30-49a5-424f-aebe-7719500a5698",
    "title": "iB Hubs Super 30 | Honouring the teachers who shape the generations",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibhubs-super-30-img.png",
    "channel": {
      "name": "iB Hubs",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-hubs-img.png"
    },
    "view_count": "8.4K",
    "published_at": "Jul 23, 2019"
  },
  {
    "id": "e426dbb7-cf95-42cb-aca8-9f4d3194b256",
    "title": "iB Hubs IoT Bootcamp 2018",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibhubs-bootcamp-img.png",
    "channel": {
      "name": "iB Hubs",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-hubs-img.png"
    },
    "view_count": "1.5K",
    "published_at": "Dec 31, 2018"
  },
  {
    "id": "c049fa98-d91b-43d5-84d6-f57af0b5de6c",
    "title": "Journey of a Social Entrepreneur - Talk by Ms. Mukti K Bosco",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ibhubs-img.png",
    "channel": {
      "name": "iB Hubs",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/ib-hubs-img.png"
    },
    "view_count": "823",
    "published_at": "Nov 1, 2016"
  },
  {
    "id": "6fcf2fe2-8cb8-4693-9ee8-45e09f9d2b30",
    "title": "5 Things you need to know to get high-paying jobs | CCBP 4.0 | NxtWave",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-motivation-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "6.5K",
    "published_at": "May 22, 2021"
  },
  {
    "id": "80ef9ba0-61ef-4e65-9f3c-506bfda7e74e",
    "title": "For the 1st time in my village, a girl graduated and got an IT job | Shobha | NxtWave CCBP Review",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-1-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "1K",
    "published_at": "Aug 2, 2021"
  },
  {
    "id": "a7b783bd-73d8-4b21-bc41-9a00ba015f3d",
    "title": "Fortunate to learn about 4.0 technologies in my B.Tech 1st year | Student Community | NxtWave Review",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-2-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "21K",
    "published_at": "Jul 17, 2021"
  },
  {
    "id": "b5f11f30-0b42-4b20-b228-40b611fa463e",
    "title": "[Telugu] A Parent's heartfelt review of the NxtWave CCBP Program",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-3-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "2.4K",
    "published_at": "Jul 31, 2021"
  },
  {
    "id": "fce38366-577c-42a2-9886-312d38e2bd56",
    "title": "6 Year Career Gap to a Software Engineer | NxtWave - CCBP | Bhavya Success Story",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-4-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "1.8K",
    "published_at": "Aug 12, 2021"
  },
  {
    "id": "9d784e89-4d4f-465c-a933-1d03f3a112cb",
    "title": "From Civil Engineer to Full Stack Developer in 4 months | NxtWave & CCBP 4.0 | Review",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-5-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "10.2K",
    "published_at": "Apr 19, 2021"
  },
  {
    "id": "79ddf1f3-65ce-4464-be83-775a8f6a0e5f",
    "title": "From a struggling coder to a high-paid tech job | NxtWave - CCBP 4.0 | Success - Review",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-6-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "5K",
    "published_at": "May 24, 2021"
  },
  {
    "id": "d1d89ac3-9652-450a-ad6c-2eed76a894d4",
    "title": "[Telugu] I recommend every parent to provide CCBP to their Children | NxtWave Parents Review",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-7-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "6K",
    "published_at": "Aug 6, 2021"
  },
  {
    "id": "336ef790-5a13-4a43-b7d8-b24866fa9c9d",
    "title": "[Telugu] An ECE graduate to an Associate Software Engineer | NxtWave - CCBP 4.0 | Success - Review",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-8-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "3.5K",
    "published_at": "Jun 24, 2021"
  },
  {
    "id": "4c9d11ec-5d49-4a8e-be31-a40955074b7b",
    "title": "Bootcamp gave me deeper insights on emerging technologies | NxtWave - Student Community | Review",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-9-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "910",
    "published_at": "Jul 12, 2021"
  },
  {
    "id": "85afde7d-a685-4a5f-ad2f-c3fc516b2e42",
    "title": "Bootcamp gave me 360 degrees knowledge on IoT | NxtWave - Student Community | Review",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-10-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "597",
    "published_at": "Jul 5, 2021"
  },
  {
    "id": "c3f9625a-9c01-408d-b6c4-57117d62ee35",
    "title": "Bootcamp boosted my knowledge in AI/ML & Cybersecurity | NxtWave - Student Community | Review",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-11-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "9K",
    "published_at": "Jul 4, 2021"
  },
  {
    "id": "a9bdf0ed-05e4-407e-b2bb-8a29d4c36ac8",
    "title": "[Telugu] Overcame fears with mock interviews and cleared my job interview| NxtWave| Yashwanth Review",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-12-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "4.5K",
    "published_at": "Sep 1, 2021"
  },
  {
    "id": "0f6e0294-0cb4-47ec-bba5-981fd9fff86e",
    "title": "[Telugu]Coding practices & cheat-sheets made me competent for projects | CCBP 4.0 Review |Sudharshan",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxtwave-success-13-img.png",
    "channel": {
      "name": "NxtWave",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/nxt-wave-img.png"
    },
    "view_count": "2K",
    "published_at": "Sep 2, 2021"
  },
  {
    "id": "00780a5b-0b73-4cbe-91c6-91371fd8f078",
    "title": "The Things Conference India 2018 | After Movie",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/things-conference-img.png",
    "channel": {
      "name": "CyberEye",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/cyber-eye-img.png"
    },
    "view_count": "75K",
    "published_at": "Apr 23, 2020"
  },
  {
    "id": "330f1c47-2608-452a-ad65-e0d9b159d00c",
    "title": "The Things Conference India 2019 | After Movie",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/things-conference-2-img.png",
    "channel": {
      "name": "CyberEye",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/cyber-eye-img.png"
    },
    "view_count": "23K",
    "published_at": "Apr 23, 2020"
  },
  {
    "id": "9420a07a-df83-419e-a46e-ed308103e829",
    "title": "Avinash Dara, CyberEye | Smart Campus - A Deployment Perspective | The Things Virtual Conference",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/things-conference-cyber-eye-img.png",
    "channel": {
      "name": "CyberEye",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/cyber-eye-img.png"
    },
    "view_count": "23K",
    "published_at": "Apr 23, 2020"
  },
  {
    "id": "f163fd54-0f08-4cc1-a5aa-308f27132cc6",
    "title": "The Things Conference India 2019 After Movie",
    "thumbnail_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/things-conference-2-img.png",
    "channel": {
      "name": "The Things Network",
      "profile_image_url": "https://assets.ccbp.in/frontend/react-js/nxt-watch/the-things-network-img.png"
    },
    "view_count": "2.6K",
    "published_at": "Oct 23, 2019"
  }
]

setTimeout(() => {


  console.log("table created ")
  data.forEach((video) => {
    const {
      id,
      title,
      thumbnail_url,
      channel,
      view_count,
      published_at,
    } = video;
    const {
      name: channel_name,
      profile_image_url: channel_profile_image_url,
    } = channel;

    const insertQuery = `
            INSERT INTO home_videos (id, title, thumbnail_url, channel_name, channel_profile_image_url, view_count, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

    database.run(insertQuery, [
      id,
      title,
      thumbnail_url,
      channel_name,
      channel_profile_image_url,
      view_count,
      published_at,
    ]);
  });
  console.log("data loaded s")
}, 5000);
