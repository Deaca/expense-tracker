import { MAX_DATE_RANGE } from "@/lib/constants";
import { differenceInDays } from "date-fns";
import { z } from "zod";

export const OverviewQuerySchema = z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
}).refine((arg) => {
    const {from, to} = arg;
    const days = differenceInDays(to, from);
    
    const isValidRange = days >= 0 && days <= MAX_DATE_RANGE;
    return isValidRange;
});