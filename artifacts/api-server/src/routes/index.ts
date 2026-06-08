import { Router, type IRouter } from "express";
import healthRouter from "./health";
import generateRouter from "./generate";
import deployRouter from "./deploy";
import countRouter from "./count";
import logRouter from "./log";
import directoryRouter from "./directory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(generateRouter);
router.use(deployRouter);
router.use(countRouter);
router.use(logRouter);
router.use(directoryRouter);

export default router;
