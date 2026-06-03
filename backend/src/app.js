import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
// basic configurations middleware hai
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
// cors configurations kon communicate url karega bata rha hai
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// import the routes
import healthCheckRouter from "./routes/healthcheck.js";
import authRouter from "./routes/auth.js";
import projectRouter from "./routes/project.js";
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);

app.get("/", (req, res) => {
  res.send("Welcome to basecampy");
});
export default app;
