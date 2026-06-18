import { handleApiPath, type Env } from "./[[path]]";

export const onRequest: PagesFunction<Env> = (context) => handleApiPath(context, context.request.method.toUpperCase(), "availability-responses");
