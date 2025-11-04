import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url || !url.startsWith('https://pokepast.es/')) {
      return NextResponse.json({ message: 'Invalid URL' }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PokehuntBot/1.0)',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ message: 'Failed to fetch pokepaste' }, { status: res.status });
    }

    const html = await res.text();
    
    // Extract content from <pre> tags
    const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (!preMatch) {
      return NextResponse.json({ message: 'No paste content found' }, { status: 404 });
    }

    // Remove all HTML tags and decode entities
    let content = preMatch[1]
      .replace(/<[^>]+>/g, '') // Remove all HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    // Clean up extra whitespace while preserving line breaks
    content = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Pokepaste proxy error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
