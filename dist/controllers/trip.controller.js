"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPlaces = exports.generateAISupplement = exports.generateAIPlan = exports.publishTrip = exports.reorderStops = exports.deleteStop = exports.updateStop = exports.addStop = exports.getTrip = exports.createTrip = void 0;
const trip_service_1 = require("../services/trip.service");
const error_handler_1 = require("../middleware/error-handler");
exports.createTrip = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const trip = await trip_service_1.tripService.createTrip(userId, req.body);
    res.status(201).json(trip);
});
exports.getTrip = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const tripId = req.params.tripId;
    const trip = await trip_service_1.tripService.getTrip(tripId);
    res.json(trip);
});
exports.addStop = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const tripId = req.params.tripId;
    const userId = req.user.userId;
    const stop = await trip_service_1.tripService.addStop(tripId, userId, req.body);
    res.status(201).json(stop);
});
exports.updateStop = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const tripId = req.params.tripId;
    const stopId = req.params.stopId;
    const userId = req.user.userId;
    const stop = await trip_service_1.tripService.updateStop(tripId, stopId, userId, req.body);
    res.json(stop);
});
exports.deleteStop = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const tripId = req.params.tripId;
    const stopId = req.params.stopId;
    const userId = req.user.userId;
    await trip_service_1.tripService.deleteStop(tripId, stopId, userId);
    res.json({ message: "Stop deleted successfully" });
});
exports.reorderStops = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const tripId = req.params.tripId;
    const userId = req.user.userId;
    const { stopIds } = req.body;
    if (!Array.isArray(stopIds)) {
        res.status(400).json({ message: "stopIds array is required" });
        return;
    }
    const result = await trip_service_1.tripService.reorderStops(tripId, userId, stopIds);
    res.json(result);
});
exports.publishTrip = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const tripId = req.params.tripId;
    const userId = req.user.userId;
    const trip = await trip_service_1.tripService.publishTrip(tripId, userId);
    res.json(trip);
});
exports.generateAIPlan = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const tripId = req.params.tripId;
    const userId = req.user.userId;
    const stops = await trip_service_1.tripService.generateAIPlan(tripId, userId);
    res.json({ message: "AI plan generated", stops });
});
exports.generateAISupplement = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const tripId = req.params.tripId;
    const userId = req.user.userId;
    const newStops = await trip_service_1.tripService.generateAISupplement(tripId, userId);
    res.json({ message: "Supplement generated", newStops });
});
exports.searchPlaces = (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { keyword, lat, lng, radiusKm } = req.query;
    if (!keyword) {
        res.status(400).json({ message: "keyword query parameter is required" });
        return;
    }
    const results = await trip_service_1.tripService.searchPlaces(keyword, lat ? parseFloat(lat) : undefined, lng ? parseFloat(lng) : undefined, radiusKm ? parseFloat(radiusKm) : undefined);
    res.json(results);
});
