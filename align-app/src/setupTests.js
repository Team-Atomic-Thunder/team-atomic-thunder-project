// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

const { TextEncoder, TextDecoder } = require('util');
const { ReadableStream } = require('web-streams-polyfill');

// Using global instead of globalThis to avoid ESLint errors
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.ReadableStream = ReadableStream;

// Using global.setImmediate instead of globalThis.setImmediate
global.setImmediate = global.setImmediate || ((fn) => setTimeout(fn, 0));