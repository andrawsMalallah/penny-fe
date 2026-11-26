import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../api/client';
import type { SessionResponse } from '../api/types';
import { getStartupSession } from './sessionStartup';

const authenticatedSession: SessionResponse = {
  user: { id: 1, display_name: 'Penny user', email: 'user@example.test', language: 'en' },
  two_factor_pending: false,
};

test('a transient startup failure retries and keeps a verified signed-in response', async () => {
  let calls = 0;
  const result = await getStartupSession(async () => {
    calls += 1;
    if (calls === 1) {
      throw new ApiError('Temporary connection failure', { status: 0, isServiceUnavailable: true });
    }
    return authenticatedSession;
  }, 0);

  assert.equal(calls, 2);
  assert.deepEqual(result, authenticatedSession);
});

test('a JSON server error is retried before reporting the session as unverified', async () => {
  let calls = 0;
  const result = await getStartupSession(async () => {
    calls += 1;
    if (calls === 1) throw new ApiError('Server unavailable', { status: 503 });
    return authenticatedSession;
  }, 0);

  assert.equal(calls, 2);
  assert.deepEqual(result, authenticatedSession);
});

test('a confirmed guest response is authoritative and is not retried', async () => {
  let calls = 0;
  const result = await getStartupSession(async () => {
    calls += 1;
    return { user: null, two_factor_pending: false };
  }, 0);

  assert.equal(calls, 1);
  assert.equal(result.user, null);
});

test('persistent startup failure is reported instead of becoming a guest response', async () => {
  let calls = 0;
  await assert.rejects(
    getStartupSession(async () => {
      calls += 1;
      throw new ApiError('Temporary connection failure', { status: 0, isServiceUnavailable: true });
    }, 0),
    ApiError
  );
  assert.equal(calls, 2);
});
