import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";


export async function GET(request: Request) {
    const user = await currentUser();
    if (!user) {
        redirect("sign-in");
    }

    const {searchParams} = new URL(request.url);
    const paramType = searchParams.get("type");

    const validator = z.enum(["expense", "income"]).nullable();
    const queryParam = validator.safeParse(paramType)
    if(!queryParam.success) {
        return Response.json(queryParam.error, {status: 400});
    }

    const type = queryParam.data;
    const categories = await prisma.category.findMany({
        where: {
            userId: user.id,
            ...(type && {type}), // if type is not null, add it to the query
        },
        orderBy: {
            name: "asc",
        },
    });

    return Response.json(categories);
}