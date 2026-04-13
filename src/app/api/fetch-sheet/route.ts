// Proxy endpoint for fetching public Google Sheets as CSV
// Avoids CORS issues by fetching server-side

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = body.url as string;

    if (!url) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    // Extract sheet ID from various Google Sheets URL formats
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      return Response.json({ error: "Invalid Google Sheets URL. Expected format: https://docs.google.com/spreadsheets/d/..." }, { status: 400 });
    }

    const sheetId = match[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    const res = await fetch(csvUrl, {
      headers: { "Accept": "text/csv" },
    });

    if (!res.ok) {
      return Response.json(
        { error: "Could not fetch sheet. Make sure it is set to 'Anyone with the link can view'." },
        { status: 400 }
      );
    }

    const csvText = await res.text();
    return Response.json({ csv: csvText });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch sheet" },
      { status: 500 }
    );
  }
}
