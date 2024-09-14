"use server";

import prisma from "@/lib/prisma";
import { CreateTransactionSchema, CreateTransactionSchemaType } from "@/schema/transaction";
import { currentUser } from "@clerk/nextjs/server";
import { create } from "domain";
import { redirect } from "next/navigation";

export async function CreateTransaction(form: CreateTransactionSchemaType) {
    const parseBody = CreateTransactionSchema.safeParse(form);
    if(!parseBody.success) {
        throw new Error(parseBody.error.message);
    }

    const user = await currentUser();
    if (!user) {
        redirect("sign-in");
    }
    
    const {amount, category, date, description, type} = parseBody.data;
    const categoryRow = await prisma.category.findFirst({
        where: {
            userId: user.id,
            name: category,
        },
    });

    if(!categoryRow) {
        throw new Error("Category not found");
    }

    //NOTE: Don't make confusion between $transaction (prisma) and prisma.transaction (table)

    await prisma.transaction.create({
        //Create user transaction
        data: {
            userId: user.id,
            amount, 
            date,
            description: description || "",
            type, 
            category: categoryRow.name, 
            categoryIcon: categoryRow.icon,
        },
    });

    //Update month aggregate table
    await prisma.monthHistory.upsert({
        where: {
            userId_day_month_year: {
                userId: user.id,
                day: date.getUTCDate(),
                month: date.getUTCMonth(),
                year: date.getUTCFullYear(),
            },            
        },
        create: {
            userId: user.id,
            day: date.getUTCDate(),
            month: date.getUTCMonth(),
            year: date.getUTCFullYear(),
            expense: type === "expense" ? amount : 0,
            income: type === "income" ? amount : 0,
        },
        update: {
            expense: {
                increment: type === "expense" ? amount : 0,
            },
            income: {
                increment: type === "income" ? amount : 0,
            },
        },
    });

    //Update year aggregate table
    await prisma.yearHistory.upsert({
        where: {
            userId_month_year: {
                userId: user.id,
                month: date.getUTCMonth(),
                year: date.getUTCFullYear(),
            },            
        },
        create: {
            userId: user.id,
            month: date.getUTCMonth(),
            year: date.getUTCFullYear(),
            expense: type === "expense" ? amount : 0,
            income: type === "income" ? amount : 0,
        },
        update: {
            expense: {
                increment: type === "expense" ? amount : 0,
            },
            income: {
                increment: type === "income" ? amount : 0,
            },
        },
    });
}