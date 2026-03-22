import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "chatbot_emotion", // your DB name
  password: "your_password",
  port: 5432,
});