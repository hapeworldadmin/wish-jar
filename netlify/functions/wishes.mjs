import { wishesResponse } from "../../lib/wishesResponse.js";

export default async (req) => {
  const result = await wishesResponse(req.method);
  return new Response(result.body, {
    status: result.status,
    headers: result.headers,
  });
};

export const config = {
  path: "/api/wishes",
};
