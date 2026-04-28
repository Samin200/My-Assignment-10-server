const express = require("express");
const app = express();
const port = 5020;

const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ke1tl7z.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // ✅ CONNECT DB PROPERLY
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ MongoDB connected successfully");

    const database = client.db("MovieMasterPro");
    const moviesCollection = database.collection("movies");
    const usersCollection = database.collection("Users");

    // ================= ROUTES =================

    app.get("/", (req, res) => {
      res.send("Server is running");
    });

    // -------- MOVIES --------

    app.get("/movies", async (req, res) => {
      try {
        const result = await moviesCollection.find().limit(50).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.get("/movies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await moviesCollection.findOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.post("/movies", async (req, res) => {
      try {
        const result = await moviesCollection.insertOne(req.body);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.patch("/movies/:id", async (req, res) => {
      try {
        const id = req.params.id;

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
          if (req.body[field] !== undefined) {
            updateData[field] = req.body[field];
          }
        });

        const result = await moviesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.delete("/movies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await moviesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // -------- REVIEWS --------

    app.post("/movies/:id/review", async (req, res) => {
      try {
        const { id } = req.params;
        const { userId, name, photoURL, text, rating } = req.body;

        await moviesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $push: {
              reviews: {
                userId,
                name,
                photoURL,
                text,
                rating,
                createdAt: new Date(),
              },
            },
          }
        );

        res.send({ message: "Review added!" });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // -------- LIKE / DISLIKE --------

    app.post("/movies/:id/like", async (req, res) => {
      try {
        const { id } = req.params;
        const { userId } = req.body;

        await moviesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $addToSet: { likes: userId },
            $pull: { dislikes: userId },
          }
        );

        res.send({ message: "Liked!" });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.post("/movies/:id/dislike", async (req, res) => {
      try {
        const { id } = req.params;
        const { userId } = req.body;

        await moviesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $addToSet: { dislikes: userId },
            $pull: { likes: userId },
          }
        );

        res.send({ message: "Disliked!" });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // -------- USERS --------

    app.post("/users", async (req, res) => {
      try {
        const result = await usersCollection.insertOne(req.body);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.get("/users", async (req, res) => {
      try {
        const email = req.query.email;
        const query = email ? { email } : {};
        const result = await usersCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.get("/users/:id", async (req, res) => {
      try {
        const result = await usersCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.get("/users/watchlist", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email)
          return res.status(400).send({ error: "Email is required" });

        const user = await usersCollection.findOne(
          { email },
          { projection: { watchlist: 1 } }
        );

        res.send(user?.watchlist || []);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.patch("/users/watchlist", async (req, res) => {
      try {
        const email = req.query.email;
        const movie = req.body.movie;

        if (!email || !movie)
          return res.status(400).send({ error: "Missing data" });

        if (movie._id) movie._id = movie._id.toString();

        await usersCollection.updateOne(
          { email },
          { $addToSet: { watchlist: movie } },
          { upsert: true }
        );

        res.send({ message: "Movie added to watchlist" });
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    app.patch("/users/profile", async (req, res) => {
      try {
        const email = req.query.email;
        const { name, photoURL } = req.body;

        const result = await usersCollection.updateOne(
          { email },
          { $set: { name, photoURL } }
        );

        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // ================= START SERVER =================

    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Server failed:", err);
  }
}

run();