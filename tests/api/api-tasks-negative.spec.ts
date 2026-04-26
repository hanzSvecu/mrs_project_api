import { test, expect } from '@playwright/test';
import { createTask, deleteTask } from '../../src/api/tasks.api';

const baseURL = 'http://localhost:8080';

const invalidTextCases = [
  { name: 'empty string', value: '', expectedStatus: 422 },
  { name: 'null', value: null, expectedStatus: 422 },
  { name: 'number', value: 0, expectedStatus: 422 },
  { name: 'boolean', value: false, expectedStatus: 422 },
  { name: 'missing text', value: undefined, expectedStatus: 422 },
  // as the target DB is json file, it is probably unlimited; adding it there for compleation
  // { name: 'too long text', value: 'x'.repeat(1000), expectedStatus: 422 },
];

/** 
  Doesn't include "empty id" case, because it would trigger different endpoint (POST /tasks instead of POST /tasks/{id})
  for /tasks/{id} endpoint swagger defines only:
  * 422	Bad request
*/
const invalidIdCases_taskId = [
  { name: 'short id', id: 'abc', expectedStatus: 422 },
  { name: 'boolean-like-true id', id: 'true', expectedStatus: 422 },
  { name: 'boolean-like-false id', id: 'false', expectedStatus: 422 },
  { name: 'boolean-true id', id: true, expectedStatus: 422 },
  { name: 'boolean-false id', id: false, expectedStatus: 422 },
  { name: 'too long id', id: 'a'.repeat(100), expectedStatus: 422 },
  { name: 'valid format but non-existing id', id: 'abcdefghijklmnopqrstu', expectedStatus: 422 },
];

/**
  For POST /tasks/{id}/complete, POST /tasks/{id}/incomplete and DELETE /tasks/{id} endpoints swagger defines:
  * 400	ID of task was not found
  * 422	Bad request
  As id is path parameter, true and false values are expected to be converted to string, so removing boolean cases
*/ 
const neg_cmp_icmp_del_taskId = [
  { name: 'empty id', id: '', expectedStatus: 400 }, 
  { name: 'short id', id: 'abc', expectedStatus: 400 },
  { name: 'boolean-like-true id', id: 'true', expectedStatus: 400 },
  { name: 'boolean-like-false id', id: 'false', expectedStatus: 400 },
  { name: 'too long id', id: 'a'.repeat(100), expectedStatus: 422 },
  { name: 'valid format but non-existing id', id: 'abcdefghijklmnopqrstu', expectedStatus: 422 },
];

test.describe('Tasks API', { tag: ['@negative'] }, () => {
    test.describe('POST /tasks - negative validation', () => {
    for (const testCase of invalidTextCases) {
        test(`returns RC ${testCase.expectedStatus} for invalid text: ${testCase.name}`, async ({ request }) => {
        const data =
            testCase.value === undefined
            ? {}
            : { text: testCase.value };
            console.log('data=' + JSON.stringify(data));
            console.log('data=' + JSON.stringify(testCase.value));
            const response = await request.post(`${baseURL}/tasks`, { data });
            expect(response.status(),`Expected status ${testCase.expectedStatus} but got ${response.status()}`)
            .toBe(testCase.expectedStatus);
        });
    }
    });

    test.describe('POST /tasks/{id} - invalid body', () => {
        for (const testCase of invalidTextCases) {
            test(`returns RC ${testCase.expectedStatus} for invalid update text: ${testCase.name}`, async ({ request }) => {
            const task = await createTask(request, `Update negative ${Date.now()}`);

            try {
                const data =
                testCase.value === undefined
                    ? {}
                    : { text: testCase.value };

                const response = await request.post(`${baseURL}/tasks/${task.id}`, { data });

                expect(response.status(),`Expected status ${testCase.expectedStatus} but got ${response.status()}`)
                .toBe(testCase.expectedStatus);
            } finally {
                await deleteTask(request, task.id);
            }
            });
        }
    });

    test.describe('POST /tasks/{id} - invalid URL id', () => {
    for (const testCase of invalidIdCases_taskId) {
        test(`returns RC ${testCase.expectedStatus} for invalid id: ${testCase.name}`, async ({ request }) => {
        const response = await request.post(`${baseURL}/tasks/${testCase.id}`, {
            data: { text: `Correct text - ${testCase.name}` },
        });

        expect(response.status(),`Expected status ${testCase.expectedStatus} but got ${response.status()}`)
        .toBe(testCase.expectedStatus);
        });
    }
    });

    test.describe('POST /tasks/{id}/complete - invalid id', () => {
        for (const testCase of neg_cmp_icmp_del_taskId.filter(testCase => testCase.id !== '')) {
            test(`returns RC ${testCase.expectedStatus} for invalid id: ${testCase.name}`, async ({ request }) => {
                const response = await request.post(`${baseURL}/tasks/${testCase.id}/complete`);

                expect(response.status(),`Expected status ${testCase.expectedStatus} but got ${response.status()}`)
                .toBe(testCase.expectedStatus);
                }
            );
        }
    });

    test.describe('POST /tasks/{id}/incomplete - invalid id', () => {
        for (const testCase of neg_cmp_icmp_del_taskId.filter(testCase => testCase.id !== '')) {
            test(`returns RC ${testCase.expectedStatus} for invalid id: ${testCase.name}`, async ({ request }) => {
                const response = await request.post(`${baseURL}/tasks/${testCase.id}/incomplete`);

                expect(response.status(),`Expected status ${testCase.expectedStatus} but got ${response.status()}`)
                .toBe(testCase.expectedStatus);
            });
        }
    });

    // validate expected business behavior: 
    // completed task should remain completed and should have original completedDate after second completion attempt
    test('POST /tasks/{id}/complete on already completed task keeps task completed', 
        { tag: ['@business'] }, async ({ request }) => {
        const task = await createTask(request, `Already completed ${Date.now()}`);
        const completeResponse = `${baseURL}/tasks/${task.id}/complete`;
        try {
            const firstResponse = await request.post(completeResponse);
            expect(firstResponse.status()).toBe(200);

            const firstBody = await firstResponse.json();

            const secondResponse = await request.post(completeResponse);
            expect(secondResponse.status()).toBe(200);

            const secondBody = await secondResponse.json();

            expect(secondBody.completed, `Expected completed to be true but got ${secondBody.completed}`)
            .toBe(true);
            expect(secondBody.id, `Expected id to be ${task.id} but got ${secondBody.id}`)
            .toBe(task.id);

            // Expected business behavior:
            expect(secondBody.completedDate, 
                `Expected completedDate to be ${firstBody.completedDate} but got ${secondBody.completedDate} 
                on second completion attempt while calling POST on ${completeResponse}`)
                .toBe(firstBody.completedDate);
        } finally {
            await deleteTask(request, task.id);
        }
    });

    // validate expected business behavior: 
    // incompleted task should remain incompleted and should not have completedDate after any incompletion attempt
    test('POST /tasks/{id}/incomplete on already incomplete task keeps task incomplete and without completedDate', 
        { tag: ['@business'] }, async ({ request }) => {
        const task = await createTask(request, `Already incomplete ${Date.now()}`);

        try {
            const response = await request.post(`${baseURL}/tasks/${task.id}/incomplete`);

            expect(response.status()).toBe(200);

            const body = await response.json();

            expect(body.id, `Expected id to be ${task.id} but got ${body.id}`)
            .toBe(task.id);
            expect(body.completed, `Expected completed to be false but got ${body.completed}`)
            .toBe(false);
            expect(body.completedDate, `Expected completedDate to not be present but got ${body.completedDate}`)
            .toBeFalsy();
        } finally {
            await deleteTask(request, task.id);
        }
    });

    test.describe('DELETE /tasks/{id} - invalid id', () => {
        for (const testCase of neg_cmp_icmp_del_taskId) {
            test(`returns expected status for invalid id: ${testCase.name}`, async ({ request }) => {
            const requestURL = `${baseURL}/tasks/${testCase.id}`;
            const response = await request.delete(requestURL);

            expect(response.status(), 
            `Expected status ${testCase.expectedStatus} but got ${response.status()} while calling DELETE on ${requestURL}`)
            .toBe(testCase.expectedStatus);
            });
        }
    });
});