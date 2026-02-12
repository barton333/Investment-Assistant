
// This file is no longer needed for Vercel deployment.
// If you switch back to Cloudflare Pages, restore the previous content.
export const onRequest = async () => {
  return new Response("Please use Vercel for this deployment configuration.", { status: 404 });
};
