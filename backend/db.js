import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "chatbot_emotion",
  password: "carboanion",
  port: 5432,
});