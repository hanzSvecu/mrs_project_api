import { test, expect } from '@playwright/test';
import type { Task } from '../../src/types/task';
import { createTask, deleteTask } from '../../src/api/tasks.api';

const baseURL = 'http://localhost:8080';

function verifyTaskContent(task: Task, expectedText: string, completed: boolean = false) {
  expect(task).toHaveProperty('id');
  expect(task).toHaveProperty('text');
  expect(task).toHaveProperty('completed');
  expect(task).toHaveProperty('createdDate');

  expect(task.id).toEqual(expect.any(String))
  expect(task.id).toHaveLength(21);
  expect(task.text).toContain(expectedText);
  expect(task.createdDate).toEqual(expect.any(Number));
  expect(task.completed).toBe(completed);
  if (task.completed) {
    expect(task.completedDate).toEqual(expect.any(Number));
  }
}


test.describe('Tasks API', { tag: ['@positive'] }, () => {

  test('@smoke POST /tasks and GET /tasks', async ({ request }) => {
    const taskName = 'Smoke task';
    const createdTask = await createTask(request, taskName);

    try {
      const response = await request.get(`${baseURL}/tasks`);
      expect(response.status()).toBe(200);

      const tasks: Task[] = await response.json();
      const foundTask = tasks.find(task => task.id === createdTask.id);

      expect(foundTask).toBeDefined();
      expect(foundTask).toMatchObject({
        id: createdTask.id,
        text: createdTask.text,
        completed: false,
      });
      expect(foundTask!.createdDate).toEqual(expect.any(Number));
    } finally {
      await deleteTask(request, createdTask.id);
    }
  });
  
  test('POST /tasks - create task', async ({ request }) => {
    const task = await createTask(request, 'Test task');

    verifyTaskContent(task, 'Test task');

    await deleteTask(request, task.id);
  });

  test('POST /tasks/{id}/complete - set task as completed', async ({ request }) => {
    const task = await createTask(request, 'Task to complete');

    const completeResponse = await request.post(`${baseURL}/tasks/${task.id}/complete`);
    expect(completeResponse.status()).toBe(200);

    const completedTask: Task = await completeResponse.json();
    expect(completedTask.id).toBe(task.id);
    expect(completedTask.completed).toBe(true);
    expect(completedTask.completedDate).toBeTruthy();

    await deleteTask(request, task.id);
  });

  test('POST /tasks/{id}/incomplete - set task as incomplete', async ({ request }) => {
    const task = await createTask(request, 'Task to incomplete');

    await request.post(`${baseURL}/tasks/${task.id}/complete`);

    const incompleteResponse = await request.post(`${baseURL}/tasks/${task.id}/incomplete`);
    expect(incompleteResponse.status()).toBe(200);

    const incompleteTask: Task = await incompleteResponse.json();
    expect(incompleteTask.id).toBe(task.id);
    expect(incompleteTask.completed).toBe(false);

    await deleteTask(request, task.id);
  });

  // runs on default data set, as all other tests create and delete their own data
  test('GET /tasks/completed returns only completed tasks', async ({ request }) => {
    const response = await request.get(`${baseURL}/tasks/completed`);
    expect(response.status()).toBe(200);

    const tasks = await response.json();
    expect(Array.isArray(tasks)).toBeTruthy();
    expect(tasks.length).toBeGreaterThanOrEqual(1);

    for (const task of tasks) {
      expect(task.completed).toBe(true);
    }
  });

});