import { Router, type IRouter } from "express";
import healthRouter from "./health";
import githubMemoryRouter from "./github-memory";
import salesRouter from "./sales";
import groqRouter from "./groq";
import researchRouter from "./research";
import financeRouter from "./finance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(githubMemoryRouter);
router.use(salesRouter);
router.use(groqRouter);
router.use(researchRouter);
router.use(financeRouter);

export default router;
