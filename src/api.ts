/// <reference types="vinxi/types/server" />
import { createStartAPIHandler } from "@tanstack/start-api-routes";

export default createStartAPIHandler(async ({ request }) => {
  const { auth } = await import("~/lib/auth");
  const response = await auth.handler(request);
  return response;
});
