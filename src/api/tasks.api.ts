import { expect, type APIRequestContext } from '@playwright/test';
import type { Task } from '../types/task';

const baseURL = 'http://localhost:8080';

export async function createTask( request: APIRequestContext, taskName: any, expectedStatus: number = 200 ): Promise<Task> {
  const response = await request.post(`${baseURL}/tasks`, {data: { text: `${taskName}}` }});

  expect(response.status()).toBe(expectedStatus);

  return await response.json();
}

export async function deleteTask( request: APIRequestContext, id: string, expectedStatus: number = 200 ): Promise<void> {
  const response = await request.delete(`${baseURL}/tasks/${id}`);

  expect(response.status()).toBe(expectedStatus);
}
