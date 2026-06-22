import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeUrl = searchParams.get('store_url');
  
  const wpUrl = storeUrl ? decodeURIComponent(storeUrl) : (process.env.NEXT_PUBLIC_WP_URL || "https://konfigurator.skillup-szkolenia.pl");
  const cleanWpUrl = wpUrl.replace(/\/$/, "");

  try {
    const res = await fetch(`${cleanWpUrl}/wp-json/garage/v1/config?t=${new Date().getTime()}`, { 
      cache: 'no-store',
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!res.ok) throw new Error(`Serwer WP odrzucił połączenie (Status: ${res.status})`);
    
    const data = await res.json();
    data.storeUrl = cleanWpUrl; 
    
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error("Błąd Agenta API:", error.message);
    return NextResponse.json({ error: "API_FETCH_FAILED", message: error.message }, { status: 500 });
  }
}