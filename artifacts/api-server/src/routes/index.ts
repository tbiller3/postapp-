import { Router, type IRouter } from "express";
import healthRouter from "./health";
import appsRouter from "./apps";
import workspaceRouter from "./workspace";

const router: IRouter = Router();

router.use(healthRouter);
router.use(appsRouter);
router.use(workspaceRouter);

export default router;
