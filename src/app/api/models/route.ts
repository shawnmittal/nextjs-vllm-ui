import { NextRequest, NextResponse } from "next/server";

// Keep GET for backward compatibility
export async function GET(req: NextRequest): Promise<NextResponse> {
  const baseUrl = process.env.VLLM_URL;
  const apiKey = process.env.VLLM_API_KEY;
  
  if (!baseUrl) {
    return NextResponse.json(
      { error: "VLLM_URL is not set", code: "NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const headers = new Headers();
  if (apiKey !== undefined) {
    headers.set("Authorization", `Bearer ${apiKey}`);
    headers.set("api-key", apiKey);
  }

  const envModel = process.env.VLLM_MODEL;
  if (envModel) {
    return NextResponse.json({
      object: "list",
      data: [{ id: envModel }],
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: headers,
      cache: "no-store",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (res.status !== 200) {
      const statusText = res.statusText;
      const responseBody = await res.text();
      console.error(`vLLM /api/models response error: ${responseBody}`);
      return NextResponse.json(
        {
          success: false,
          error: statusText,
        },
        { status: res.status }
      );
    }
    return new NextResponse(res.body, res);
  } catch (error: any) {
    console.error(error);
    if (error.name === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          error: "Request timeout",
          code: "TIMEOUT",
        },
        { status: 504 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// New POST endpoint that accepts configuration
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { apiUrl, apiKey } = body;
    
    // Use provided config or fall back to environment variables
    const baseUrl = apiUrl || process.env.VLLM_URL;
    const authKey = apiKey || process.env.VLLM_API_KEY;
    
    if (!baseUrl) {
      return NextResponse.json(
        { error: "API URL not configured", code: "NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const headers = new Headers();
    if (authKey) {
      headers.set("Authorization", `Bearer ${authKey}`);
      headers.set("api-key", authKey);
    }

    // Check for hardcoded model in env
    const envModel = process.env.VLLM_MODEL;
    if (envModel) {
      return NextResponse.json({
        object: "list",
        data: [{ id: envModel }],
      });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const res = await fetch(`${baseUrl}/v1/models`, {
        headers: headers,
        cache: "no-store",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const statusText = res.statusText;
        const responseBody = await res.text().catch(() => "");
        console.error(`vLLM /api/models response error: ${responseBody}`);
        return NextResponse.json(
          {
            error: `vLLM server error: ${statusText}`,
            code: "API_ERROR",
            status: res.status,
          },
          { status: res.status }
        );
      }
      
      const models = await res.json();
      return NextResponse.json(models);
      
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          {
            error: "Request timeout - server may be slow or unresponsive",
            code: "TIMEOUT",
          },
          { status: 504 }
        );
      }
      
      console.error("Failed to fetch models:", fetchError);
      return NextResponse.json(
        {
          error: "Failed to connect to vLLM server",
          code: "CONNECTION_ERROR",
          details: fetchError.message,
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error("Models API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error.message,
      },
      { status: 500 }
    );
  }
}