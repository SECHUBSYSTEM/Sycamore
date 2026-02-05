import "dotenv/config";
import express, { type Application } from "express";
import { routes } from "./routes";

const app: Application = express();
app.use(express.json());
app.use(routes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export { app };
