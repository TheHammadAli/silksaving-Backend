import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "../lib/apiZod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
