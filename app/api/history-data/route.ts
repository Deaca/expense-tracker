import prisma from "@/lib/prisma";
import { Period, TimeFrame } from "@/lib/type";
import { currentUser } from "@clerk/nextjs/server";
import { getDaysInMonth } from "date-fns";
import { get } from "http";
import { redirect } from "next/navigation";
import { z } from "zod";

const getHistoryDataSchema = z.object({
    timeframe: z.enum(["month", "year"]),
    month: z.coerce.number().min(0).max(11),
    year: z.coerce.number().min(2000).max(3000),
});

export async function GET(request: Request) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const {searchParams} = new URL(request.url);
    const timeframe = searchParams.get("timeframe");
    const year =  searchParams.get("year");
    const month = searchParams.get("month");

    const queryParam = getHistoryDataSchema.safeParse({
        timeframe,
        year,
        month
    });

    if(!queryParam.success) {
        return Response.json("Invalid query params", {status: 400});
    }

    const data = await getHistoryData(user.id, queryParam.data.timeframe, {
        year: queryParam.data.year,
        month: queryParam.data.month
    });

    return Response.json(data);
}

export type GetHistoryDataResponseType = Awaited<ReturnType<typeof getHistoryData>>;

async function getHistoryData(userId: string, timeframe: TimeFrame, period: Period) {
 switch(timeframe) {
     case "year":
        return await getYearHistoryData(userId, period.year);
    case "month":
        return await getMonthHistoryData(userId, period.year, period.month);
 }
}

type HistoryData = {
    expense: number;
    income: number;
    month: number;
    year: number;
    day?: number;
}

async function getYearHistoryData(userId: string, year: number) {
    const result = await prisma.monthHistory.groupBy({
        by: ["month"],
        where: {
            userId,
            year
        },
        _sum: {
            expense: true,
            income: true,
        },
        orderBy: [
            {
                month: 'asc'
            }
        ],
    });

    if(!result || result.length === 0) {
        return [];
    }
    
    const data: HistoryData[] = [];

    for(let i = 0; i < 12; i++) {
        const month = result.find((r) => r.month === i);
        if(month) {
            data.push({
                month: i,
                year,
                expense: month._sum.expense || 0,
                income: month._sum.income || 0
            });
        } else {
            data.push({
                month: i,
                year,
                expense: 0,
                income: 0
            });
        }
    }

    return data;
}

async function getMonthHistoryData(userId: string, year: number, month: number) {
    const result = await prisma.monthHistory.groupBy({
        by: ["day"],
        where: {
            userId,
            year,
            month
        },
        _sum: {
            expense: true,
            income: true,
        },
        orderBy: [
            {
                day: 'asc'
            }
        ]
    });

    if(!result || result.length === 0) {
        return [];
    }
     
    const data: HistoryData[] = [];
    const daysInMonth = getDaysInMonth(new Date(year, month));
    for(let i = 1; i <= daysInMonth; i++) {
        const day = result.find((r) => r.day === i);
        if(day) {
            data.push({
                year,
                month,
                day: i,
                expense: day._sum.expense || 0,
                income: day._sum.income || 0
            });
        } else {
            data.push({
                year,
                month,
                day: i,
                expense: 0,
                income: 0
            });
        }
    }

    return data;
}