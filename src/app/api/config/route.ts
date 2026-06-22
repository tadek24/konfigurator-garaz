import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeUrl = searchParams.get('store_url');
  
  // Pobieramy domenę WP z paska URL (ramka) lub z ukrytej zmiennej w Vercel (link bezpośredni)
  const wpUrl = storeUrl ? decodeURIComponent(storeUrl) : (process.env.NEXT_PUBLIC_WP_URL || "https://konfigurator.skillup-szkolenia.pl");
  const cleanWpUrl = wpUrl.replace(/\/$/, "");

  try {
    // Serwer Vercel pyta serwer WP (CORS tutaj NIE ISTNIEJE, to ruch backendowy!)
    const res = await fetch(`${cleanWpUrl}/wp-json/garage/v1/config?t=${new Date().getTime()}`, { 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!res.ok) throw new Error("Błąd pobierania");
    const data = await res.json();
    
    // Zwracamy czyste dane do naszego Frontendu
    data.storeUrl = cleanWpUrl; 
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json({ error: "Nie udało się połączyć z bazą WP" }, { status: 500 });
  }
}