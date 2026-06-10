const { PDFParse } = require('pdf-parse');
const path = require('path');
const url = require('url');

try {
  const workerPath = require.resolve('pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs');
  const workerUrl = url.pathToFileURL(workerPath).toString();
  console.log('Worker URL:', workerUrl);
  PDFParse.setWorker(workerUrl);
  console.log('Worker set successfully!');
} catch (e) {
  console.error('Error:', e);
}
