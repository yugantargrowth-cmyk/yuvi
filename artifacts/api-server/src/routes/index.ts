import { Router, type IRouter } from "express";
import healthRouter from "./health";
import githubMemoryRouter from "./github-memory";
import salesRouter from "./sales";
import groqRouter from "./groq";
import researchRouter from "./research";

const router: IRouter = Router();

router.use(healthRouter);
router.use(githubMemoryRouter);
router.use(salesRouter);
router.use(groqRouter);
router.use(researchRouter);

export default router;
