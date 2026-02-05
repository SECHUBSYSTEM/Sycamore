// Load env so DATABASE_URL is set when tests import app code (e.g. interest.service -> models -> database).
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:54320/sycamore_test";
}
