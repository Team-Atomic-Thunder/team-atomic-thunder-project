import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Intentional Failing Test', () => {
  test('this test will fail to verify workflow', () => {
    // This assertion will fail, triggering the workflow
    expect(true).toBe(true);
  });
  
  // You can also include a test that passes to see both results
  test('this test should pass', () => {
    expect(true).toBe(true);
  });
});