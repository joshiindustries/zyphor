import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { noStoreJson } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    if (!startStr || !endStr) {
      return noStoreJson({ error: "start and end dates required" }, { status: 400 });
    }

    const start = new Date(startStr);
    const end = new Date(endStr);

    const events = await prisma.event.findMany({
      where: {
        calendar: { user_id: user.id },
        start_time: { gte: start },
        end_time: { lte: end }
      },
      orderBy: { start_time: "asc" }
    });

    return noStoreJson({ success: true, events });
  } catch (error) {
    console.error("Error fetching events:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { calendar_id, encrypted_title, encrypted_description, encrypted_location, start_time, end_time, is_all_day } = await request.json();

    if (!calendar_id || !encrypted_title || !start_time || !end_time) {
      return noStoreJson({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify calendar ownership
    const calendar = await prisma.eventCalendar.findUnique({
      where: { id: calendar_id }
    });

    if (!calendar || calendar.user_id !== user.id) {
      return noStoreJson({ error: "Calendar not found or forbidden" }, { status: 404 });
    }

    const event = await prisma.event.create({
      data: {
        calendar_id,
        encrypted_title,
        encrypted_description,
        encrypted_location,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        is_all_day: is_all_day || false
      }
    });

    return noStoreJson({ success: true, event });
  } catch (error) {
    console.error("Error creating event:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { event_id, encrypted_title, encrypted_description, encrypted_location, start_time, end_time, is_all_day } = await request.json();

    if (!event_id) {
      return noStoreJson({ error: "event_id is required" }, { status: 400 });
    }

    // Verify ownership
    const event = await prisma.event.findUnique({
      where: { id: event_id },
      include: { calendar: true }
    });

    if (!event || event.calendar.user_id !== user.id) {
      return noStoreJson({ error: "Event not found or forbidden" }, { status: 404 });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: event_id },
      data: {
        encrypted_title: encrypted_title !== undefined ? encrypted_title : event.encrypted_title,
        encrypted_description: encrypted_description !== undefined ? encrypted_description : event.encrypted_description,
        encrypted_location: encrypted_location !== undefined ? encrypted_location : event.encrypted_location,
        start_time: start_time !== undefined ? new Date(start_time) : event.start_time,
        end_time: end_time !== undefined ? new Date(end_time) : event.end_time,
        is_all_day: is_all_day !== undefined ? is_all_day : event.is_all_day
      }
    });

    return noStoreJson({ success: true, event: updatedEvent });
  } catch (error) {
    console.error("Error updating event:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return noStoreJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("id");

    if (!eventId) {
      return noStoreJson({ error: "event id required" }, { status: 400 });
    }

    // Verify ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { calendar: true }
    });

    if (!event || event.calendar.user_id !== user.id) {
      return noStoreJson({ error: "Event not found or forbidden" }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id: eventId }
    });

    return noStoreJson({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return noStoreJson({ error: "Internal server error" }, { status: 500 });
  }
}
