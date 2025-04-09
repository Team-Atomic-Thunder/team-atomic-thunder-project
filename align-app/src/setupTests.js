// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

const { TextEncoder, TextDecoder } = require('util');
const { ReadableStream } = require('web-streams-polyfill');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
globalThis.ReadableStream = ReadableStream;

globalThis.setImmediate = global.setImmediate || ((fn:any) => setTimeout(fn, 0));
