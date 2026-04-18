import { NextRequest, NextResponse } from 'next/server';

interface VisionFeature {
  type: string;
  maxResults?: number;
}

interface VisionAnnotation {
  description?: string;
  score?: number;
  name?: string;
  boundingPoly?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Vision API key not configured' }, { status: 500 });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const features: VisionFeature[] = [
      { type: 'TEXT_DETECTION', maxResults: 10 },
      { type: 'LABEL_DETECTION', maxResults: 10 },
      { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
    ];

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Data },
              features,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Vision API error:', errorData);
      return NextResponse.json({ error: 'Vision API request failed' }, { status: 500 });
    }

    const data = await response.json();
    const result = data.responses?.[0];

    if (!result) {
      return NextResponse.json({ error: 'No results from Vision API' }, { status: 500 });
    }

    // Extract text
    const fullText = result.fullTextAnnotation?.text || '';
    const textAnnotations = (result.textAnnotations || []) as VisionAnnotation[];

    // Extract labels
    const labels = (result.labelAnnotations || []).map(
      (label: VisionAnnotation) => label.description
    ).filter(Boolean) as string[];

    // Extract objects
    const objects = (result.localizedObjectAnnotations || []).map(
      (obj: VisionAnnotation) => obj.name
    ).filter(Boolean) as string[];

    // Compose natural language description
    const description = composeDescription(fullText, labels, objects);

    return NextResponse.json({
      text: fullText,
      labels,
      objects,
      description,
    });
  } catch (error) {
    console.error('Vision processing error:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}

function composeDescription(text: string, labels: string[], objects: string[]): string {
  const parts: string[] = [];

  if (text.trim()) {
    const trimmedText = text.trim();
    if (trimmedText.length > 500) {
      parts.push(`I can read the following text: ${trimmedText.slice(0, 500)}. There is more text, but I'll read the main part for now.`);
    } else {
      parts.push(`I can read the following text: ${trimmedText}`);
    }
  }

  if (objects.length > 0) {
    const uniqueObjects = [...new Set(objects)];
    if (uniqueObjects.length === 1) {
      parts.push(`I can see a ${uniqueObjects[0].toLowerCase()}.`);
    } else {
      const last = uniqueObjects.pop()!.toLowerCase();
      const rest = uniqueObjects.map(o => o.toLowerCase()).join(', ');
      parts.push(`I can see ${rest} and ${last}.`);
    }
  }

  if (labels.length > 0 && !text.trim()) {
    const topLabels = labels.slice(0, 5).map(l => l.toLowerCase());
    parts.push(`The scene appears to contain: ${topLabels.join(', ')}.`);
  }

  if (parts.length === 0) {
    return "I wasn't able to clearly identify anything in the image. Try pointing the camera at something closer or with better lighting.";
  }

  return parts.join(' ');
}
