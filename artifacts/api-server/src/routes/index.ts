import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import appsRouter from "./apps";
import workspaceRouter from "./workspace";
import appleRouter from "./apple";
import assistantRouter from "./assistant/index.js";
import wrapRouter from "./wrap/index.js";
import settingsRouter from "./settings/index.js";
import stripeRouter from "./stripe/index.js";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.use(healthRouter);
router.use(authRouter);
// Stripe plans are public (no auth required)
router.use(stripeRouter);
router.use(requireAuth);
router.use(appsRouter);
router.use(workspaceRouter);
router.use(appleRouter);
router.use(assistantRouter);
router.use(wrapRouter);
router.use(settingsRouter);

export default router;
