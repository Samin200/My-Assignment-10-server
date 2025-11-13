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
    await client.connect();
    const database = client.db("MovieMasterPro");
    const moviesCollection = database.collection("movies");
    const usersCollection = database.collection("Users");

    app.get("/", (req, res) => {
      res.send("My assignment 10 server is running");
    });

    app.get("/movies", async (req, res) => {
      const cursor = moviesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/movies/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await moviesCollection.findOne(query);
      res.send(result);
    });

    app.get("/users/watchlist", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) return res.status(400).send({ error: "Email is required" });

        const user = await usersCollection.findOne(
          { email },
          { projection: { _id: 0, watchlist: 1 } }
        );

        if (!user) return res.status(404).send({ error: "User not found" });

        // Make sure watchlist is always an array
        const watchlist = Array.isArray(user.watchlist) ? user.watchlist : [];
        res.send(watchlist);
      } catch (err) {
        console.error("Error in /users/watchlist:", err);
        res.status(500).send({ error: err.message });
      }
    });

    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.patch("/movies/:id", async (req, res) => {
      try {
        const id = req.params.id;
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
          if (req.body[field] !== undefined)
            updateData[field] = req.body[field];
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

        // Ensure _id is a string to avoid BSON issues
        if (movie._id) movie._id = movie._id.toString();

        const query = { email };

        // Initialize watchlist if it doesn't exist
        await usersCollection.updateOne(
          { email, watchlist: { $exists: false } },
          { $set: { watchlist: [] } }
        );

        // Add movie to watchlist (no duplicates)
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

      const query = { email };
      const update = { $set: { name, photoURL } };
      const result = await usersCollection.updateOne(query, update);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const email = req.query.email;
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
      const query = { _id: new ObjectId(id) };
      const result = await moviesCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/movies", async (req, res) => {
      const movie = req.body;
      const result = await moviesCollection.insertOne(movie);
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const users = req.body;
      const result = await usersCollection.insertOne(users);
      res.send(result);
    });

  app.post("/movies/:id/review", async (req, res) => {
  const { id } = req.params;
  const { userId, name, photoURL, text, rating } = req.body; // <- add photoURL

  await moviesCollection.updateOne(
    { _id: new ObjectId(id) },
    { $push: { reviews: { userId, name, photoURL, text, rating, createdAt: new Date() } } }
  );

  res.send({ message: "Review added!" });
});
// Like
app.post("/movies/:id/like", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  await moviesCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $addToSet: { likes: userId },
      $pull: { dislikes: userId } // remove from dislikes if exists
    }
  );
  res.send({ message: "Liked!" });
});

// Dislike
app.post("/movies/:id/dislike", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  await moviesCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $addToSet: { dislikes: userId },
      $pull: { likes: userId } // remove from likes if exists
    }
  );
  res.send({ message: "Disliked!" });
});

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`My assignment 10 server is running on port: ${port}`);
});
