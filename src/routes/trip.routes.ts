import { Router } from "express";
import * as tripController from "../controllers/trip.controller";

const router = Router();

router.post("/", tripController.createTrip);
router.get("/:tripId", tripController.getTrip);
router.get("/group/:groupId", tripController.getTripsByGroup);

// AI & Search routes
router.post("/:tripId/generate", tripController.generateAIPlan);
router.post("/:tripId/supplement", tripController.generateAISupplement);
router.get("/places/search", tripController.searchPlaces);

// Trip Stop routes
router.post("/:tripId/stops", tripController.addStop);
router.patch("/:tripId/stops/reorder", tripController.reorderStops);
router.patch("/:tripId/stops/:stopId", tripController.updateStop);
router.delete("/:tripId/stops/:stopId", tripController.deleteStop);

// Publish
router.patch("/:tripId/publish", tripController.publishTrip);

export default router;
