import { Request, Response } from "express";
import { tripService } from "../services/trip.service";
import { asyncHandler } from "../middleware/error-handler";

export const createTrip = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const trip = await tripService.createTrip(userId, req.body);
  res.status(201).json(trip);
});

export const getTrip = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.tripId as string;
  const trip = await tripService.getTrip(tripId);
  res.json(trip);
});

export const addStop = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.tripId as string;
  const userId = req.user!.userId;
  const stop = await tripService.addStop(tripId, userId, req.body);
  res.status(201).json(stop);
});

export const updateStop = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.tripId as string;
  const stopId = req.params.stopId as string;
  const userId = req.user!.userId;
  const stop = await tripService.updateStop(tripId, stopId, userId, req.body);
  res.json(stop);
});

export const deleteStop = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.tripId as string;
  const stopId = req.params.stopId as string;
  const userId = req.user!.userId;
  await tripService.deleteStop(tripId, stopId, userId);
  res.json({ message: "Stop deleted successfully" });
});

export const reorderStops = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.tripId as string;
  const userId = req.user!.userId;
  const { stopIds } = req.body;
  if (!Array.isArray(stopIds)) {
    res.status(400).json({ message: "stopIds array is required" });
    return;
  }
  const result = await tripService.reorderStops(tripId, userId, stopIds);
  res.json(result);
});

export const publishTrip = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.tripId as string;
  const userId = req.user!.userId;
  const trip = await tripService.publishTrip(tripId, userId);
  res.json(trip);
});

export const generateAIPlan = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.tripId as string;
  const userId = req.user!.userId;
  const stops = await tripService.generateAIPlan(tripId, userId);
  res.json({ message: "AI plan generated", stops });
});

export const generateAISupplement = asyncHandler(async (req: Request, res: Response) => {
  const tripId = req.params.tripId as string;
  const userId = req.user!.userId;
  const newStops = await tripService.generateAISupplement(tripId, userId);
  res.json({ message: "Supplement generated", newStops });
});

export const searchPlaces = asyncHandler(async (req: Request, res: Response) => {
  const { keyword, lat, lng, radiusKm } = req.query;
  if (!keyword) {
    res.status(400).json({ message: "keyword query parameter is required" });
    return;
  }
  const results = await tripService.searchPlaces(
    keyword as string,
    lat ? parseFloat(lat as string) : undefined,
    lng ? parseFloat(lng as string) : undefined,
    radiusKm ? parseFloat(radiusKm as string) : undefined
  );
  res.json(results);
});
