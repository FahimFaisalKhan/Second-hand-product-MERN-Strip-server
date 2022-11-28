import dotenv from "dotenv";
dotenv.config();

export default {
  type: process.env.FIRE_TYPE,
  project_id: process.env.FIRE_PROJECT_ID,
  private_key_id: process.env.FIRE_PRIVATE_KEY_ID,
  private_key: process.env.FIRE_PRIVATE_KEY,
  client_email: process.env.FIRE_CLIENT_EMAIL,
  client_id: process.env.FIRE_CLIENT_ID,
  auth_uri: process.env.FIRE_AUTH_URI,
  token_uri: process.env.FIRE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIRE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIRE_CLIENT_X509_CERT_UR,
};
