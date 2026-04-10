require("dotenv").config();

const express = require("express");
const path = require("path");

const billingRoutes = require("./routes/billing");
const submissionRoutes = require("./routes/submissions");
const analyzerRoutes = require("./routes/analyzer");
const pipelineRoutes = require("./routes/pipeline");
const reviewerRoutes = require("./routes/reviewer");
const timelineRoutes = require("./routes/timeline");

const app = express();
const PORT = process.env.PORT || 3000;

app.locals.mockDb = {
  submission_credits: [],
  purchases: [],
  subscriptions: []
};

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.use((req, res, next) => {
  req.user = {
    id: "user_123",
    email: "demo@postapp.com",
    name: "Demo User",
    plan_name: "free",
    subscription_status: "inactive",
    stripe_customer_id: null
  };
  next();
});

app.use("/api/billing", billingRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/analyzer", analyzerRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/reviewer", reviewerRoutes);
app.use("/api/timeline", timelineRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "POSTAPP V31 Reviewer Mode + Submission Timeline",
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`POSTAPP V31 running on http://localhost:${PORT}`);
});
