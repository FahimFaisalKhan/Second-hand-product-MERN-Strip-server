import jwt from "jsonwebtoken";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mongobasics-cluster.xxxwrvw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// const productsTable = client.db("Bechakena-Base").collection("products");
const usersTable = client.db("Bechakena-Base").collection("users");
const verifyUserJWT = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth) {
    res.status(403).send({ message: "did not get token" });
  } else {
    jwt.verify(auth, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        res.status(401).send({ message: "wrong Token" });
      } else {
        req.decoded = decoded;

        console.log(decoded);
        next();
      }
    });
  }
};

const verifySeller = async (req, res, next) => {
  const email = req.decoded.email;

  if (!email) {
    res.status(403).send({ message: "user bot found" });
  } else {
    const user = await usersTable.findOne({ email: email });

    if (user.role === "seller") {
      next();
    } else {
      res.status(401).send({ message: "not allowed" });
    }
  }
};
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;

  if (!email) {
    res.status(403).send({ message: "user bot found" });
  } else {
    const user = await usersTable.findOne({ email: email });

    if (user.role === "admin") {
      next();
    } else {
      res.status(401).send({ message: "not allowed" });
    }
  }
};
export { verifyUserJWT, verifySeller, verifyAdmin };
