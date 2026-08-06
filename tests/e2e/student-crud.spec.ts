import { test, expect } from '@playwright/test';

// Base URL for API (adjust if your dev server runs on a different port)
const API_BASE = process.env.BASE_URL || 'http://localhost:3000';

// Helper to generate random student data
function randomString(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

test.describe('Student CRUD end‑to‑end flow', () => {
  let createdStudentId: string;
  const studentData = {
    name: `Test Student ${randomString(5)}`,
    phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    academicStageId: '', // will be filled after fetching a stage
    groupId: '', // will be filled after fetching a group
    parentName: 'Test Parent',
    parentPhone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    parentRelation: 'Father',
  };

  // Fetch a valid academicStageId and groupId to satisfy foreign‑key constraints
  test.beforeAll(async () => {
    const stagesRes = await fetch(`${API_BASE}/api/academic-stages`);
    const stages = await stagesRes.json();
    if (stages.success && stages.academicStages?.length) {
      studentData.academicStageId = stages.academicStages[0].id;
    }
    const groupsRes = await fetch(`${API_BASE}/api/groups`);
    const groups = await groupsRes.json();
    if (groups.success && groups.groups?.length) {
      studentData.groupId = groups.groups[0].id;
    }
  });

  test('Create a new student via POST', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/students`, {
      data: studentData,
    });
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.student).toBeDefined();
    createdStudentId = body.student.id;
  });

  test('Read the created student via GET', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/students/${createdStudentId}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.student).toBeDefined();
    expect(body.student.name).toBe(studentData.name);
  });

  test('Update the student name via PATCH', async ({ request }) => {
    const newName = `${studentData.name} Updated`;
    const response = await request.patch(`${API_BASE}/api/students/${createdStudentId}`, {
      data: { name: newName },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBeTruthy();
    // Verify update
    const getRes = await request.get(`${API_BASE}/api/students/${createdStudentId}`);
    const getBody = await getRes.json();
    expect(getBody.student.name).toBe(newName);
  });

  test('Delete the student via DELETE', async ({ request }) => {
    const response = await request.delete(`${API_BASE}/api/students/${createdStudentId}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBeTruthy();
    // Ensure it no longer exists
    const checkRes = await request.get(`${API_BASE}/api/students/${createdStudentId}`);
    expect(checkRes.status()).toBe(404);
  });
});
