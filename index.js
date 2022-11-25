import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

dotenv.config();
const app = express();

const port = process.env.PORT || 5000;
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mongobasics-cluster.xxxwrvw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const productsTable = client.db("Bechakena-Base").collection("products");
const usersTable = client.db("Bechakena-Base").collection("users");

try {
  //HANDLING PRODUCTS

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
    console.log(user, userExist);
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
    console.log(email);

    if (email !== "undefined") {
      console.log("a");
      const user = await usersTable.findOne({
        email: email,
      });

      res.send(user);
    }
  });
} catch (err) {
  console.log(err.message);
}

app.get("/", (req, res) => {
  res.send("server running");
});

app.listen(port);
