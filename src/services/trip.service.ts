import { TripMode, TripStatus, TripSource } from "@prisma/client";
import { aiService } from "./ai.service";
import prisma from "../config/database";

export const tripService = {
  async createTrip(userId: string, data: {
    group_id: string;
    name: string;
    destination: string;
    destination_lat?: number;
    destination_lng?: number;
    start_date: string;
    end_date: string;
    mode: TripMode;
    preference?: {
      num_people: number;
      budget_per_person: number;
      preferences: string; // JSON string
      travel_style: string;
      radius_km: number;
    }
  }) {
    // Basic verification - checking if group exists and user is admin
    // Note: Premium check will be added later or checked via middleware
    const group = await prisma.group.findUnique({ where: { id: data.group_id } });
    if (!group) throw new Error("Group not found");
    if (group.created_by !== userId) throw new Error("Only group creator can create trips");

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
        status: TripStatus.DRAFT,
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

  async getTrip(tripId: string) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        stops: {
          orderBy: { order: 'asc' }
        },
        preference: true
      }
    });
    if (!trip) throw new Error("Trip not found");
    return trip;
  },

  async addStop(tripId: string, userId: string, data: {
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
    type?: string;
    scheduled_time?: string;
    photo_url?: string;
    rating?: number;
    description?: string;
    google_place_id?: string;
    source?: TripSource;
  }) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.created_by !== userId) throw new Error("Only trip creator can add stops");

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
        source: data.source || TripSource.MANUAL
      }
    });

    return stop;
  },

  async updateStop(tripId: string, stopId: string, userId: string, data: {
    scheduled_time?: string;
    description?: string;
  }) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.created_by !== userId) throw new Error("Only trip creator can update stops");

    const stop = await prisma.tripStop.update({
      where: { id: stopId },
      data
    });

    return stop;
  },

  async deleteStop(tripId: string, stopId: string, userId: string) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.created_by !== userId) throw new Error("Only trip creator can delete stops");

    await prisma.tripStop.delete({ where: { id: stopId } });
    return { message: "Stop deleted" };
  },

  async reorderStops(tripId: string, userId: string, stopIds: string[]) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.created_by !== userId) throw new Error("Only trip creator can reorder stops");

    // Perform updates in a transaction
    await prisma.$transaction(
      stopIds.map((id, index) => 
        prisma.tripStop.update({
          where: { id },
          data: { order: index + 1 }
        })
      )
    );

    return { message: "Reordered successfully" };
  },

  async publishTrip(tripId: string, userId: string) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new Error("Trip not found");
    if (trip.created_by !== userId) throw new Error("Only trip creator can publish trips");

    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.PUBLISHED }
    });

    return updated;
  },

  async generateAIPlan(tripId: string, userId: string) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { preference: true, stops: true }
    });
    
    if (!trip) throw new Error("Trip not found");
    if (trip.created_by !== userId) throw new Error("Only trip creator can generate plan");
    if (!trip.preference) throw new Error("Trip preferences are missing for AI generation");

    // Clear existing stops if regenerating
    if (trip.stops.length > 0) {
      await prisma.tripStop.deleteMany({ where: { trip_id: tripId } });
    }

    const { destination_lat, destination_lng, start_date, end_date } = trip;
    let { destination } = trip;
    const { num_people, budget_per_person, travel_style, preferences, radius_km } = trip.preference;

    // Resolve "Vị trí hiện tại" to a real city name using Mapbox reverse geocoding
    if (destination === 'Vị trí hiện tại' && destination_lat && destination_lng) {
      const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
      if (MAPBOX_TOKEN && !MAPBOX_TOKEN.includes('YOUR_MAPBOX')) {
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${destination_lng},${destination_lat}.json?access_token=${MAPBOX_TOKEN}&language=vi&types=place,locality`;
          const axios = require('axios');
          const response = await axios.get(url);
          const feature = response.data.features?.[0];
          if (feature && feature.text) {
            destination = feature.text;
            // Optionally update it in DB so the UI also shows the real name
            await prisma.trip.update({ where: { id: tripId }, data: { destination } });
          }
        } catch (e) {
          console.error("Reverse geocoding failed", e);
        }
      }
    }

    // 1. Get structured plan from Gemini
    const planStructure = await aiService.generateTripPlanStructure({
      destination,
      startDate: start_date,
      endDate: end_date,
      numPeople: num_people,
      budget: Number(budget_per_person),
      travelStyle: travel_style,
      preferences: preferences,
      radiusKm: radius_km
    });

    // 2. Map structure to real places via Google Places
    let orderCounter = 1;
    const tripStops = [];

    for (const item of planStructure) {
      // Find place
      const places = await aiService.searchPlaces(
        item.search_keyword, 
        destination_lat || undefined, 
        destination_lng || undefined, 
        radius_km,
        item.estimated_rating
      );

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
          source: TripSource.AI
        }
      });
      tripStops.push(newStop);
    }

    return tripStops;
  },

  async generateAISupplement(tripId: string, userId: string) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { preference: true, stops: { orderBy: { order: 'asc' } } }
    });
    
    if (!trip) throw new Error("Trip not found");
    if (trip.created_by !== userId) throw new Error("Only trip creator can generate supplement");
    if (!trip.preference) throw new Error("Trip preferences are missing for AI supplement");

    const existingStops = trip.stops.map(s => ({
      time: s.scheduled_time || "unknown",
      type: s.type || "unknown",
      name: s.name
    }));

    let { destination } = trip;
    
    if (destination === 'Vị trí hiện tại' && trip.destination_lat && trip.destination_lng) {
      const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
      if (MAPBOX_TOKEN && !MAPBOX_TOKEN.includes('YOUR_MAPBOX')) {
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${trip.destination_lng},${trip.destination_lat}.json?access_token=${MAPBOX_TOKEN}&language=vi&types=place,locality`;
          const axios = require('axios');
          const response = await axios.get(url);
          if (response.data.features?.[0]?.text) {
            destination = response.data.features[0].text;
          }
        } catch (e) {}
      }
    }

    const supplementStops = await aiService.generateSupplementStops({
      destination: destination,
      existingStops,
      preferences: trip.preference.preferences,
      travelStyle: trip.preference.travel_style
    });

    // Get max order
    let orderCounter = trip.stops.length > 0 ? trip.stops[trip.stops.length - 1].order + 1 : 1;
    const newStops = [];

    for (const item of supplementStops) {
      const places = await aiService.searchPlaces(
        item.search_keyword, 
        trip.destination_lat || undefined, 
        trip.destination_lng || undefined, 
        trip.preference.radius_km,
        (item as any).estimated_rating
      );

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
          source: TripSource.AI
        }
      });
      newStops.push(newStop);
    }

    return newStops;
  },

  async searchPlaces(keyword: string, lat?: number, lng?: number, radiusKm?: number) {
    return await aiService.searchPlaces(keyword, lat, lng, radiusKm);
  }
};
