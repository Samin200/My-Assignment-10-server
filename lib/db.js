"use strict";
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// Build the MongoDB connection URI from environment variables
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ke1tl7z.mongodb.net/?appName=Cluster0`;

let client;
let moviesCollection;
let usersCollection;
let connected = false;

async function connectClient() {
  if (connected) return;
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  const database = client.db("MovieMasterPro");
  moviesCollection = database.collection("movies");
  usersCollection = database.collection("Users");
  // Optional ping to confirm connection
  await client.db("admin").command({ ping: 1 });
  connected = true;
}

async function getDB() {
  await connectClient();
  return { client, moviesCollection, usersCollection, ObjectId };
}

module.exports = { getDB, ObjectId };
