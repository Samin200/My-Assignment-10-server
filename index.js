const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const serverless = require("serverless-http");

const app = express();

app.use(express.json());
app.use(cors());

// MongoDB connection with caching for serverless
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ke1tl7z.mongodb.net/?appName=Cluster0`;

let cachedClient = null;
let cachedCollections = null;

async function getCollections() {
  if (cachedCollections) {
    return cachedCollections;
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  const database = client.db("MovieMasterPro");
  const moviesCollection = database.collection("movies");
  const usersCollection = database.collection("Users");

  cachedClient = client;
  cachedCollections = { moviesCollection, usersCollection, ObjectId };

  return cachedCollections;
}

// Routes
app.get("/", (req, res) => {
  res.send("My assignment 10 server is running");
});

app.get("/movies", async (req, res) => {
  const { moviesCollection } = await getCollections();
  const cursor = moviesCollection.find();
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/movies/:id", async (req, res) => {
  const id = req.params.id;
  const { moviesCollection, ObjectId } = await getCollections();
  const query = { _id: new ObjectId(id) };
  const result = await moviesCollection.findOne(query);
  res.send(result);
});

app.get("/users/watchlist", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).send({ error: "Email is required" });

    const { usersCollection } = await getCollections();
    const user = await usersCollection.findOne(
      { email },
      { projection: { _id: 0, watchlist: 1 } }
    );

    if (!user) return res.status(404).send({ error: "User not found" });

    const watchlist = Array.isArray(user.watchlist) ? user.watchlist : [];
    res.send(watchlist);
  } catch (err) {
    console.error("Error in /users/watchlist:", err);
    res.status(500).send({ error: err.message });
  }
});

app.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const { usersCollection, ObjectId } = await getCollections();
  const query = { _id: new ObjectId(id) };
  const result = await usersCollection.findOne(query);
  res.send(result);
});

app.patch("/movies/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { moviesCollection, ObjectId } = await getCollections();
    const query = { _id: new ObjectId(id) };

    const allowedFields = [
      "title",
      "genre",
      "releaseYear",
      "director",
      "cast",
      "rating",
      "duration",
      "plotSummary",
      "posterUrl",
      "language",
      "country",
      "addedBy",
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const update = { $set: updateData };

    const result = await moviesCollection.updateOne(query, update);
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.patch("/users/watchlist", async (req, res) => {
  try {
    const email = req.query.email;
    const movie = req.body.movie;

    if (!email) return res.status(400).send({ error: "Email is required" });
    if (!movie) return res.status(400).send({ error: "Movie is missing" });

    if (movie._id) movie._id = movie._id.toString();

    const { usersCollection } = await getCollections();
    const query = { email };

    await usersCollection.updateOne(
      { email, watchlist: { $exists: false } },
      { $set: { watchlist: [] } }
    );

    const result = await usersCollection.updateOne(query, {
      $addToSet: { watchlist: movie },
    });

    res.send({ message: "Movie added successfully", result });
  } catch (err) {
    console.error("Error in /users/watchlist:", err);
    res.status(500).send({ error: err.message });
  }
});

app.patch("/users/profile", async (req, res) => {
  const email = req.query.email;
  const { name, photoURL } = req.body;
  const { usersCollection } = await getCollections();

  const query = { email };
  const update = { $set: { name, photoURL } };
  const result = await usersCollection.updateOne(query, update);
  res.send(result);
});

app.get("/users", async (req, res) => {
  const email = req.query.email;
  const { usersCollection } = await getCollections();
  let query = {};

  if (email) {
    query = { email: email };
  }

  const cursor = usersCollection.find(query);
  const result = await cursor.toArray();
  res.send(result);
});

app.delete("/movies/:id", async (req, res) => {
  const id = req.params.id;
  const { moviesCollection, ObjectId } = await getCollections();
  const query = { _id: new ObjectId(id) };
  const result = await moviesCollection.deleteOne(query);
  res.send(result);
});

app.post("/movies", async (req, res) => {
  const movie = req.body;
  const { moviesCollection } = await getCollections();
  const result = await moviesCollection.insertOne(movie);
  res.send(result);
});

app.post("/users", async (req, res) => {
  const users = req.body;
  const { usersCollection } = await getCollections();
  const result = await usersCollection.insertOne(users);
  res.send(result);
});

app.post("/movies/:id/review", async (req, res) => {
  const { id } = req.params;
  const { userId, name, photoURL, text, rating } = req.body;
  const { moviesCollection, ObjectId } = await getCollections();

  await moviesCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $push: {
        reviews: { userId, name, photoURL, text, rating, createdAt: new Date() },
      },
    }
  );

  res.send({ message: "Review added!" });
});

app.post("/movies/:id/like", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const { moviesCollection, ObjectId } = await getCollections();

  await moviesCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $addToSet: { likes: userId },
      $pull: { dislikes: userId },
    }
  );
  res.send({ message: "Liked!" });
});

app.post("/movies/:id/dislike", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const { moviesCollection, ObjectId } = await getCollections();

  await moviesCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $addToSet: { dislikes: userId },
      $pull: { likes: userId },
    }
  );
  res.send({ message: "Disliked!" });
});

const handler = serverless(app);

module.exports = handler;