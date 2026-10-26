import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    const unreadCount = await prisma.notification.count({
      where: { isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (id) {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications PUT error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
