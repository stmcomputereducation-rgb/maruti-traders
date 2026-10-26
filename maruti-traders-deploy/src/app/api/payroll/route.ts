import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserFromRequest, isAuthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    if (session && !isAuthorized(session.role, "canViewSalaries")) {
      return NextResponse.json({ error: "Forbidden: Payroll restricted to Admin" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;

    const where: any = {};
    if (month) where.month = month;
    if (year) where.year = year;

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ payrolls });
  } catch (error) {
    console.error("Payroll GET error:", error);
    return NextResponse.json({ error: "Failed to fetch payroll" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    if (session && !isAuthorized(session.role, "canViewSalaries")) {
      return NextResponse.json({ error: "Forbidden: Only Admin can generate payroll" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, month, year, workingDays = 30, presentDays = 30, bonus = 0, advanceDeduction = 0 } = body;

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const pDays = parseFloat(presentDays) || 30;
    const wDays = parseInt(workingDays) || 30;

    // Prorated basic pay
    const basicRatio = Math.min(1, pDays / wDays);
    const basicAmount = Math.round(employee.basicSalary * basicRatio);
    const allowancesAmount = employee.allowances;
    const deductionsAmount = employee.deductions;
    const bonusAmount = parseFloat(bonus) || 0;
    const advanceAmount = parseFloat(advanceDeduction) || 0;

    const netSalary = Math.round(basicAmount + allowancesAmount + bonusAmount - deductionsAmount - advanceAmount);

    const count = await prisma.payroll.count();
    const payrollNumber = `PAYROLL-${year}-${String(month).padStart(2, "0")}-${String(count + 1).padStart(3, "0")}`;

    const payroll = await prisma.payroll.create({
      data: {
        payrollNumber,
        employeeId,
        month: parseInt(month),
        year: parseInt(year),
        workingDays: wDays,
        presentDays: pDays,
        basicAmount,
        allowancesAmount,
        deductionsAmount,
        advanceDeduction: advanceAmount,
        bonusAmount,
        netSalary,
        status: "PENDING",
      },
      include: { employee: true },
    });

    return NextResponse.json({ success: true, payroll }, { status: 201 });
  } catch (error: any) {
    console.error("Payroll POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate payroll" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSessionUserFromRequest(req);
    if (session && !isAuthorized(session.role, "canViewSalaries")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, paymentMode = "BANK_TRANSFER", transactionRef, notes } = body;

    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        status: "PAID",
        paymentDate: new Date(),
        paymentMode,
        transactionRef: transactionRef || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, payroll: updated });
  } catch (error: any) {
    console.error("Payroll PUT error:", error);
    return NextResponse.json({ error: error.message || "Failed to update salary status" }, { status: 500 });
  }
}
