import express from "express";
import cors from "cors";
import dotenv, { config } from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import Stripe from "stripe";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import firebase from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import serviceKey from "./serviceKey.js";
import jwt from "jsonwebtoken";

import { verifyAdmin, verifySeller, verifyUserJWT } from "./middleWares.js";

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
const wishlistTable = client.db("Bechakena-Base").collection("wishList");
const paymentInfoTable = client.db("Bechakena-Base").collection("paymentInfo");

try {
  //HANDLE JWT

  app.post("/jwt", (req, res) => {
    const email = req.body.email;

    const token = jwt.sign({ email: email }, process.env.JWT_SECRET);

    if (token) {
      res.send({ accessToken: token });
    } else {
      res.send({ message: "Token generation error" });
    }
  });

  //HANDLE STRIPE

  app.post("/create-payment-intent", verifyUserJWT, async (req, res) => {
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

    const result = await productsTable.findOne({ _id: ObjectId(pId) });

    res.send(result);
  });

  app.get("/mostBookedProducts", async (req, res) => {
    const result = await productsTable
      .find({ status: "available" })
      .limit(4)
      .toArray();

    res.send(result);
  });
  app.get("/advertisedItems", async (req, res) => {
    const result = await productsTable
      .find({ advertised: true, status: "available" })
      .toArray();

    res.send(result);
  });

  app.get("/categoryNames", async (req, res) => {
    const availableProds = await productsTable
      .find({ status: "available" })
      .toArray();

    const cats = availableProds.map((avProd) => avProd.category);

    const result = [...new Set(cats)];

    res.send(result);
  });

  app.get("/category/:cat", async (req, res) => {
    const cat = req.params.cat;
    const result = await productsTable
      .find({ category: cat, status: "available" })
      .toArray();

    res.send(result);
  });

  app.get("/myProducts", verifySeller, async (req, res) => {
    const email = req.query.email;

    const result = await productsTable.find({ sellerEmail: email }).toArray();

    res.send(result);
  });

  app.post("/addProducts", verifySeller, async (req, res) => {
    const product = req.body;
    const result = await productsTable.insertOne({
      ...product,
      status: "available",
      advertised: false,
    });

    res.send(result);
  });

  app.delete("/deleteProduct", verifySeller, async (req, res) => {
    const id = req.query.id;

    const result = await productsTable.deleteOne({ _id: ObjectId(id) });
    res.send(result);
  });
  app.put("/advertiseProduct", verifySeller, async (req, res) => {
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
    let result;

    result = await usersTable.findOne({
      email: email,
    });

    res.send(result);
  });

  app.get("/user/sellers", verifyAdmin, async (req, res) => {
    const result = await usersTable.find({ role: "seller" }).toArray();
    res.send(result);
  });
  app.get("/user/buyers", verifyAdmin, async (req, res) => {
    const result = await usersTable.find({ role: "buyer" }).toArray();
    res.send(result);
  });
  app.post("/user/delete", verifyAdmin, async (req, res) => {
    const email = req.body.email;
    try {
      const userRecord = await defaultAuth.getUserByEmail(email);
      if (userRecord) {
        defaultAuth
          .deleteUser(userRecord.uid)
          .then(() => {
            console.log("deleted");
          })

          .catch((err) => console.log(err.message));
      }
    } catch (err) {
      console.log(err.message);
    } finally {
      usersTable.deleteOne({ email: email }).then((response) => {
        res.send(response);
      });
    }
  });
  app.put("/user/update", verifyAdmin, async (req, res) => {
    const email = req.body.email;

    const response = await usersTable.updateOne(
      { email: email },
      { $set: { verified: true } },
      { upsert: true }
    );

    res.send(response);
  });
  //HANDLE BOOKINGS

  app.post("/booking", verifyUserJWT, async (req, res) => {
    const bookingItem = req.body;

    const result = await bookingTable.insertOne(bookingItem);
    res.send(result);
  });

  app.get("/booking", verifyUserJWT, async (req, res) => {
    const email = req.query.email;
    const result = await bookingTable.find({ buyerEmail: email }).toArray();

    res.send(result);
  });

  app.get("/bookedProducts", async (req, res) => {
    const email = req.query.email;

    const result = await bookingTable
      .find({ buyerEmail: email }, { projection: { _id: 0, productId: 1 } })
      .toArray();

    const pIds = result.map((prod) => prod.productId);

    res.send(pIds);
  });

  //HANDLE WISHLIST

  app.post("/wishList", async (req, res) => {
    const productId = req.body.pId;
    const customerEmail = req.body.customerEmail;

    const wishedTime = new Date();

    const result = await wishlistTable.insertOne({
      productId,
      customerEmail,
      wishedTime,
    });

    res.send(result);
  });

  app.get("/wishList", verifyUserJWT, async (req, res) => {
    const customerEmail = req.query.customerEmail;

    const wishes = await wishlistTable
      .find({ customerEmail: customerEmail })
      .toArray();
    const wishedIds = wishes.map((wish) => new ObjectId(wish.productId));

    const result = await productsTable
      .find({ _id: { $in: wishedIds } })
      .toArray();

    res.send(result);
  });
  app.get("/wishedProducts", async (req, res) => {
    const email = req.query.email;

    const result = await wishlistTable
      .find({ customerEmail: email }, { projection: { _id: 0, productId: 1 } })
      .toArray();

    const pIds = result.map((prod) => prod.productId);

    res.send(pIds);
  });
} catch (err) {
  console.log(err.message);
}

//HANDLE PAYMENT

app.post("/payment", verifyUserJWT, async (req, res) => {
  const pId = req.body.pId;

  const paymentId = req.body.paymentId;
  const buyerEmail = req.body.buyerEmail;
  const paymntTime = new Date();
  const updateProduct = await productsTable.updateOne(
    { _id: ObjectId(pId) },
    {
      $set: {
        status: "sold",
        advertised: false,
      },
    }
  );

  const updateBooking = await bookingTable.updateMany(
    { productId: pId },
    {
      $set: {
        status: "sold",
      },
    }
  );

  if (updateProduct.acknowledged && updateBooking.acknowledged) {
    const payedProduct = await productsTable.findOne({ _id: ObjectId(pId) });

    const sellerEmail = payedProduct.sellerEmail;

    const sellerInfo = await usersTable.findOne({ email: sellerEmail });
    const sellerName = sellerInfo.name;

    const result = await paymentInfoTable.insertOne({
      paymentId,
      sellerEmail,
      sellerName,
      buyerEmail,
      paymntTime,
    });
    res.send(result);
  }
});

app.get("/", (req, res) => {
  res.send("server running");
});

app.listen(port);
