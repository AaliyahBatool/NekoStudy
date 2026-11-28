import { copy } from '../copy';

export interface Scene {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string;
  ambientAudioUrl: string | null;
}

export interface ApiHealth {
  status: string;
  database?: string;
  redis?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function request<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    throw new ApiError(copy.errors.network, 0, 'NETWORK_ERROR');
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = isRecord(payload) && isRecord(payload.error) ? payload.error : null;

    const message =
      body && typeof body.message === 'string' ? body.message : copy.errors.unexpected;

    const code = body && typeof body.code === 'string' ? body.code : 'UNKNOWN_ERROR';

    throw new ApiError(message, response.status, code);
  }

  return payload as T;
}

export function getScenes(): Promise<Scene[]> {
  return request<Scene[]>('/api/v1/scenes');
}

export function getHealth(): Promise<ApiHealth> {
  return request<ApiHealth>('/api/v1/health');
}
