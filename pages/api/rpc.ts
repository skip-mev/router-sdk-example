// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { PageConfig } from "next";

export const config: PageConfig = {
  api: {
    externalResolver: true,
    bodyParser: false,
  },
  runtime: "edge",
};
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const endpoint = new URL(req.url as string).searchParams.get("endpoint");

  return fetch(new URL(endpoint as string), {
    body: req.body,
    method: req.method,
  });
}
