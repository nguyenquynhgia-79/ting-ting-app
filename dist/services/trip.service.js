"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tripService = void 0;
const client_1 = require("@prisma/client");
const ai_service_1 = require("./ai.service");
const prisma = new client_1.PrismaClient();
exports.tripService = {
    async createTrip(userId, data) {
        // Basic verification - checking if group exists and user is admin
        // Note: Premium check will be added later or checked via middleware
        const group = await prisma.group.findUnique({ where: { id: data.group_id } });
        if (!group)
            throw new Error("Group not found");
        if (group.created_by !== userId)
            throw new Error("Only group creator can create trips");
        const trip = await prisma.trip.create({
            data: {
                group_id: data.group_id,
                created_by: userId,
                name: data.name,
                destination: data.destination,
                destination_lat: data.destination_lat,
                destination_lng: data.destination_lng,
                start_date: new Date(data.start_date),
                end_date: new Date(data.end_date),
                mode: data.mode,
                status: client_1.TripStatus.DRAFT,
                preference: data.preference ? {
                    create: data.preference
                } : undefined
            },
            include: {
                preference: true
            }
        });
        return trip;
    },
    async getTrip(tripId) {
        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            include: {
                stops: {
                    orderBy: { order: 'asc' }
                },
                preference: true
            }
        });
        if (!trip)
            throw new Error("Trip not found");
        return trip;
    },
    async addStop(tripId, userId, data) {
        const trip = await prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip)
            throw new Error("Trip not found");
        if (trip.created_by !== userId)
            throw new Error("Only trip creator can add stops");
        // Get max order
        const lastStop = await prisma.tripStop.findFirst({
            where: { trip_id: tripId },
            orderBy: { order: 'desc' }
        });
        const order = lastStop ? lastStop.order + 1 : 1;
        const stop = await prisma.tripStop.create({
            data: {
                trip_id: tripId,
                order,
                ...data,
                source: data.source || client_1.TripSource.MANUAL
            }
        });
        return stop;
    },
    async updateStop(tripId, stopId, userId, data) {
        const trip = await prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip)
            throw new Error("Trip not found");
        if (trip.created_by !== userId)
            throw new Error("Only trip creator can update stops");
        const stop = await prisma.tripStop.update({
            where: { id: stopId },
            data
        });
        return stop;
    },
    async deleteStop(tripId, stopId, userId) {
        const trip = await prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip)
            throw new Error("Trip not found");
        if (trip.created_by !== userId)
            throw new Error("Only trip creator can delete stops");
        await prisma.tripStop.delete({ where: { id: stopId } });
        return { message: "Stop deleted" };
    },
    async reorderStops(tripId, userId, stopIds) {
        const trip = await prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip)
            throw new Error("Trip not found");
        if (trip.created_by !== userId)
            throw new Error("Only trip creator can reorder stops");
        // Perform updates in a transaction
        await prisma.$transaction(stopIds.map((id, index) => prisma.tripStop.update({
            where: { id },
            data: { order: index + 1 }
        })));
        return { message: "Reordered successfully" };
    },
    async publishTrip(tripId, userId) {
        const trip = await prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip)
            throw new Error("Trip not found");
        if (trip.created_by !== userId)
            throw new Error("Only trip creator can publish trips");
        const updated = await prisma.trip.update({
            where: { id: tripId },
            data: { status: client_1.TripStatus.PUBLISHED }
        });
        return updated;
    },
    async generateAIPlan(tripId, userId) {
        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            include: { preference: true, stops: true }
        });
        if (!trip)
            throw new Error("Trip not found");
        if (trip.created_by !== userId)
            throw new Error("Only trip creator can generate plan");
        if (!trip.preference)
            throw new Error("Trip preferences are missing for AI generation");
        // Clear existing stops if regenerating
        if (trip.stops.length > 0) {
            await prisma.tripStop.deleteMany({ where: { trip_id: tripId } });
        }
        const { destination, destination_lat, destination_lng, start_date, end_date } = trip;
        const { num_people, budget_per_person, travel_style, preferences, radius_km } = trip.preference;
        // 1. Get structured plan from Gemini
        const planStructure = await ai_service_1.aiService.generateTripPlanStructure({
            destination,
            startDate: start_date,
            endDate: end_date,
            numPeople: num_people,
            budget: Number(budget_per_person),
            travelStyle: travel_style,
            preferences: preferences
        });
        // 2. Map structure to real places via Google Places
        let orderCounter = 1;
        const tripStops = [];
        for (const item of planStructure) {
            // Find place
            const places = await ai_service_1.aiService.searchGooglePlaces(item.search_keyword, destination_lat || undefined, destination_lng || undefined, radius_km);
            const selectedPlace = places.length > 0 ? places[0] : null;
            const newStop = await prisma.tripStop.create({
                data: {
                    trip_id: tripId,
                    order: orderCounter++,
                    name: selectedPlace ? selectedPlace.name : item.search_keyword,
                    address: selectedPlace ? selectedPlace.address : null,
                    lat: selectedPlace ? selectedPlace.lat : null,
                    lng: selectedPlace ? selectedPlace.lng : null,
                    type: item.type,
                    scheduled_time: item.scheduled_time,
                    photo_url: selectedPlace ? selectedPlace.photo_url : null,
                    rating: selectedPlace ? selectedPlace.rating : null,
                    description: item.description,
                    google_place_id: selectedPlace ? selectedPlace.google_place_id : null,
                    source: client_1.TripSource.AI
                }
            });
            tripStops.push(newStop);
        }
        return tripStops;
    },
    async generateAISupplement(tripId, userId) {
        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            include: { preference: true, stops: { orderBy: { order: 'asc' } } }
        });
        if (!trip)
            throw new Error("Trip not found");
        if (trip.created_by !== userId)
            throw new Error("Only trip creator can generate supplement");
        if (!trip.preference)
            throw new Error("Trip preferences are missing for AI supplement");
        const existingStops = trip.stops.map(s => ({
            time: s.scheduled_time || "unknown",
            type: s.type || "unknown",
            name: s.name
        }));
        const supplementStops = await ai_service_1.aiService.generateSupplementStops({
            destination: trip.destination,
            existingStops,
            preferences: trip.preference.preferences,
            travelStyle: trip.preference.travel_style
        });
        // Get max order
        let orderCounter = trip.stops.length > 0 ? trip.stops[trip.stops.length - 1].order + 1 : 1;
        const newStops = [];
        for (const item of supplementStops) {
            const places = await ai_service_1.aiService.searchGooglePlaces(item.search_keyword, trip.destination_lat || undefined, trip.destination_lng || undefined, trip.preference.radius_km);
            const selectedPlace = places.length > 0 ? places[0] : null;
            const newStop = await prisma.tripStop.create({
                data: {
                    trip_id: tripId,
                    order: orderCounter++,
                    name: selectedPlace ? selectedPlace.name : item.search_keyword,
                    address: selectedPlace ? selectedPlace.address : null,
                    lat: selectedPlace ? selectedPlace.lat : null,
                    lng: selectedPlace ? selectedPlace.lng : null,
                    type: item.type,
                    scheduled_time: item.scheduled_time,
                    photo_url: selectedPlace ? selectedPlace.photo_url : null,
                    rating: selectedPlace ? selectedPlace.rating : null,
                    description: item.description,
                    google_place_id: selectedPlace ? selectedPlace.google_place_id : null,
                    source: client_1.TripSource.AI
                }
            });
            newStops.push(newStop);
        }
        return newStops;
    },
    async searchPlaces(keyword, lat, lng, radiusKm) {
        return await ai_service_1.aiService.searchGooglePlaces(keyword, lat, lng, radiusKm);
    }
};
