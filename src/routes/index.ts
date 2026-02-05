import { Router } from "express";
import { transferRoutes } from "./transfer.routes";
import { interestRoutes } from "./interest.routes";

const router: ReturnType<typeof Router> = Router();
router.use("/transfer", transferRoutes);
router.use("/accumulate", interestRoutes);

export const routes: ReturnType<typeof Router> = router;
