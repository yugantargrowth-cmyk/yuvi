import { Router, type IRouter } from "express";
import healthRouter from "./health";
import githubMemoryRouter from "./github-memory";
import salesRouter from "./sales";
import groqRouter from "./groq";

const router: IRouter = Router();

router.use(healthRouter);
router.use(githubMemoryRouter);
router.use(salesRouter);
router.use(groqRouter);

export default router;
