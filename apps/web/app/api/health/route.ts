export async function GET() { return Response.json({ status: "ok", service: "prahari-web", timestamp: new Date().toISOString() }); }
