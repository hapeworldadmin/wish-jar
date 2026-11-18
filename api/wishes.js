import { wishesResponse } from "../lib/wishesResponse.js";

export default async function handler(req, res) {
  const result = await wishesResponse(req.method);
  res.statusCode = result.status;
  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, value);
  }
  res.end(result.body ?? "");
}
