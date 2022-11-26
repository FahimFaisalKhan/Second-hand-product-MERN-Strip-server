import express from "express";
import cors from "cors";
import dotenv, { config } from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import Stripe from "stripe";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import firebase from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

import serviceKey from "./serviceKey.json" assert { type: "json" };
const stripe = new Stripe(
  "sk_test_51M6B8WJadxoSok6rrk4UgBHTeA4efuB6IeZpjqogumqAXtAuRMOh6bXSoMqsqB49azRy3gSJxWPP0myOqT21SC2200a1fhFKzu"
);
const defaultApp = initializeApp({
  credential: firebase.credential.cert(serviceKey),
});
dotenv.config();
const app = express();

const port = process.env.PORT || 5000;
app.use(express.json());
app.use(cors());
const defaultAuth = getAuth(defaultApp);
// defaultAuth.getUser()
// TODO: perform getUser and deletUser method on defaultAuth with the goal of deleting an user by addmin, remember to configuser secretKey json to env variables,
//   also TODO: 1. logout user in privateroute if he tries to access unauthorized roots.
//IMPORTANT: use nodemon --experimental-json-modules  index.js instead of nodemon index.js
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mongobasics-cluster.xxxwrvw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const productsTable = client.db("Bechakena-Base").collection("products");
const usersTable = client.db("Bechakena-Base").collection("users");

const bookingTable = client.db("Bechakena-Base").collection("bookings");

try {
  //TRY

  //HANDLE STRIPE

  app.post("/create-payment-intent", async (req, res) => {
    const { price } = req.body;
    const p = parseFloat(price) * 100;
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: p,

      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      statement_descriptor: "Custom descriptor",
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  });
  //HANDLING PRODUCTS

  app.get("/getProductById/:pId", async (req, res) => {
    const pId = req.params.pId;
    console.log(req.params);

    const result = await productsTable.findOne({ _id: ObjectId(pId) });

    res.send(result);
  });

  app.get("/mostBookedProducts", async (req, res) => {
    const result = await productsTable.find({}).limit(4).toArray();

    res.send(result);
  });
  app.get("/advertisedItems", async (req, res) => {
    const result = await productsTable.find({ advertised: true }).toArray();

    res.send(result);
  });

  app.get("/categoryNames", async (req, res) => {
    const result = await productsTable.distinct("category");
    res.send(result);
  });

  app.get("/category/:cat", async (req, res) => {
    const cat = req.params.cat;
    const result = await productsTable.find({ category: cat }).toArray();

    res.send(result);
  });

  app.get("/myProducts", async (req, res) => {
    const email = req.query.email;

    const result = await productsTable.find({ sellerEmail: email }).toArray();

    res.send(result);
  });

  app.post("/addProducts", async (req, res) => {
    const product = req.body;
    const result = await productsTable.insertOne({
      ...product,
      status: "available",
      advertised: false,
    });

    res.send(result);
  });

  app.delete("/deleteProduct", async (req, res) => {
    const id = req.query.id;

    const result = await productsTable.deleteOne({ _id: ObjectId(id) });
    res.send(result);
  });
  app.put("/advertiseProduct", async (req, res) => {
    const id = req.query.id;

    const filter = { _id: ObjectId(id) };
    const updatedDoc = {
      $set: {
        advertised: true,
      },
    };
    const options = { upsert: true };

    const result = await productsTable.updateOne(filter, updatedDoc, options);

    res.send(result);
  });
  //HANDLING USERS

  app.post("/users", async (req, res) => {
    const user = req.body;
    user.email = user.email.toLowerCase();
    const userExist = await usersTable.findOne({
      email: req.body.email,
    });
    let result;

    if (!userExist) {
      result = await usersTable.insertOne(user);
    } else {
      const social = req.query.social;

      if (social === "true") {
        await usersTable.updateOne(
          { email: req.body.email },
          {
            $set: {
              role: "buyer",
            },
          },
          { upsert: true }
        );
      }

      result = { insertedCound: 0, acknowledged: true };
    }

    res.send(result);
  });

  app.get("/user/getSellerName", async (req, res) => {
    const email = req.query.email;

    const result = await usersTable.findOne({
      role: "seller",
      email: email,
    });

    res.send(result);
  });

  app.get("/user/getRole", async (req, res) => {
    const email = req.query.email;

    if (email !== "undefined") {
      const user = await usersTable.findOne({
        email: email,
      });

      res.send(user);
    }
  });

  app.get("/user/sellers", async (req, res) => {
    const result = await usersTable.find({ role: "seller" }).toArray();
    res.send(result);
  });
  app.post("/user/seller/delete", async (req, res) => {
    const auth = req.body.auth;
    const email = req.body.email;
    const userRecord = await defaultAuth.getUserByEmail(email);
    console.log(userRecord);
    // auth
    //   .getUserByEmail(email)
    //   .then((userRecord) => console.log(userRecord))
    //   .catch((err) => console.log(err.message));
  });

  //HANDLE BOOKINGS

  app.post("/booking", async (req, res) => {
    const bookingItem = req.body;

    const result = await bookingTable.insertOne(bookingItem);
    res.send(result);
  });

  app.get("/booking", async (req, res) => {
    const email = req.query.email;
    const result = await bookingTable.find({ buyerEmail: email }).toArray();

    res.send(result);
  });

  app.get("/bookedProducts", async (req, res) => {
    const email = req.query.email;
    console.log(email);
    const result = await bookingTable
      .find({ buyerEmail: email }, { projection: { _id: 0, productId: 1 } })
      .toArray();

    const pIds = result.map((prod) => prod.productId);
    console.log(pIds);
    res.send(pIds);
  });
} catch (err) {
  console.log(err.message);
}

app.get("/", (req, res) => {
  res.send("server running");
});

app.listen(port);
