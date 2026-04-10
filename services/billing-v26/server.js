require("dotenv").config();

const express = require("express");
const path = require("path");

const billingRoutes = require("./routes/billing");
const submissionRoutes = require("./routes/submissions");
const analyzerRoutes = require("./routes/analyzer");
const pipelineRoutes = require("./routes/pipeline");

const app = express();
const PORT = process.env.PORT || 3000;

// Mock DB scaffold for now. Replace with your real DB later.
app.locals.mockDb = {
  submission_credits: [],
  purchases: [],
  subscriptions: []
};

// Static files
app.use(express.static(path.join(__dirname, "public")));

// IMPORTANT:
// In production, Stripe webhook should use raw body on a dedicated route.
// For now, we keep JSON globally for easier local integration.
app.use(express.json());

// Mock auth middleware
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
    app: "POSTAPP Billing Engine V26",
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`POSTAPP Billing Engine running on http://localhost:${PORT}`);
});
