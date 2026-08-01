import { Router, type IRouter } from "express";
import healthRouter from "./health";
import checkoutRouter from "./checkout";
import contactRouter from "./contact";
import chatLeadRouter from "./chatLead";

const router: IRouter = Router();

router.use(healthRouter);
router.use(checkoutRouter);
router.use(contactRouter);
router.use(chatLeadRouter);

export default router;
