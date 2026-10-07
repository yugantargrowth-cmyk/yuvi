import { Router, type IRouter } from "express";
import healthRouter from "./health";
import githubMemoryRouter from "./github-memory";
import salesRouter from "./sales";

const router: IRouter = Router();

router.use(healthRouter);
router.use(githubMemoryRouter);
router.use(salesRouter);

export default router;
