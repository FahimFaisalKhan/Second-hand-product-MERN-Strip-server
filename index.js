import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";

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

  //HANDLING USERS

  app.post("/users", async (req, res) => {
    const user = req.body;

    const userExist = await usersTable.findOne({
      email: { $regex: new RegExp(req.body.email, "i") },
    });
    let result;
    console.log(user, userExist);
    if (!userExist) {
      result = await usersTable.insertOne(user);
    } else {
      await usersTable.updateOne(
        { email: { $regex: new RegExp(req.body.email, "i") } },
        {
          $set: {
            role: "buyer",
          },
        },
        { upsert: true }
      );
      result = { insertedCound: 0, acknowledged: true };
    }

    res.send(result);
  });

  app.get("/user/getSellerName", async (req, res) => {
    const email = req.query.email;

    const result = await usersTable.findOne({ role: "seller", email: email });

    res.send(result);
  });
} catch (err) {
  console.log(err.message);
}

app.get("/", (req, res) => {
  res.send("server running");
});

app.listen(port);
