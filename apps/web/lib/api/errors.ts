import { NextResponse } from 'next/server';
import { ApiError } from '@battleship/core';

export { ApiError };

export function apiErrorResponse(err: ApiError): NextResponse {
  return NextResponse.json(
    { error: { code: err.code, message: err.message } },
    { status: err.status },
  );
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) return apiErrorResponse(err);
  console.error('Unhandled API error:', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Internal server error.' } },
    { status: 500 },
  );
}
