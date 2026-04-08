import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import appsRouter from "./apps";
import workspaceRouter from "./workspace";
import appleRouter from "./apple";

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
router.use(requireAuth);
router.use(appsRouter);
router.use(workspaceRouter);
router.use(appleRouter);

export default router;
