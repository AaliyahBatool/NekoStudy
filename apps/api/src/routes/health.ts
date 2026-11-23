import { Router, type Router as RouterType } from "express";

const router: RouterType = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

export default router;