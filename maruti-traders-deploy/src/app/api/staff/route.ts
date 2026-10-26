import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest, isAuthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    // Role check: Only ADMIN can view staff details and salaries
    if (session && !isAuthorized(session.role, "canViewSalaries")) {
      return NextResponse.json({ error: "Forbidden: Salary and staff records restricted to Admin" }, { status: 403 });
    }

    const employees = await prisma.employee.findMany({
      include: {
        payrolls: {
          take: 3,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { employeeCode: "asc" },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("Staff GET error:", error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    if (session && !isAuthorized(session.role, "canViewSalaries")) {
      return NextResponse.json({ error: "Forbidden: Insufficient privileges" }, { status: 403 });
    }

    const body = await req.json();
    const {
      employeeCode,
      fullName,
      phone,
      email,
      address,
      designation,
      role = "STAFF",
      godownId,
      salaryType = "MONTHLY",
      basicSalary = 15000,
      allowances = 0,
      deductions = 0,
    } = body;

    if (!fullName || !phone) {
      return NextResponse.json({ error: "Full Name and Phone are required" }, { status: 400 });
    }

    const count = await prisma.employee.count();
    const finalCode = employeeCode || `EMP-${String(count + 1).padStart(3, "0")}`;

    const employee = await prisma.employee.create({
      data: {
        employeeCode: finalCode,
        fullName,
        phone,
        email: email || null,
        address: address || "Surat",
        designation: designation || "Billing Staff",
        role,
        godownId: godownId || null,
        salaryType,
        basicSalary: parseFloat(basicSalary) || 15000,
        allowances: parseFloat(allowances) || 0,
        deductions: parseFloat(deductions) || 0,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, employee }, { status: 201 });
  } catch (error: any) {
    console.error("Staff POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create employee" }, { status: 500 });
  }
}
