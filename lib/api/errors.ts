import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiErrorResponse(err: ApiError): NextResponse {
  return NextResponse.json(
    { error: { code: err.code, message: err.message } },
    { status: err.status },
  );
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) return apiErrorResponse(err);
  // Unexpected failure: do not leak details to the client.
  console.error('Unhandled API error:', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Internal server error.' } },
    { status: 500 },
  );
}
