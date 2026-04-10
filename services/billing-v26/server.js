require("dotenv").config();

const express = require("express");
const path = require("path");

const billingRoutes = require("./routes/billing");
const submissionRoutes = require("./routes/submissions");
const analyzerRoutes = require("./routes/analyzer");
const pipelineRoutes = require("./routes/pipeline");

const app = express();
const PORT = process.env.PORT || 3000;

app.locals.mockDb = {
  submission_credits: [],
  purchases: [],
  subscriptions: []
};

app.locals.timeline = [];

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

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "POSTAPP V32 Metadata Workspace + Screenshot Matrix",
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`POSTAPP V32 running on http://localhost:${PORT}`);
});
