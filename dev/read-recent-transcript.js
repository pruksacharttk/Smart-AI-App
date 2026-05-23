import fs from 'fs';
import readline from 'readline';

async function main() {
  const filePath = 'C:\\Users\\naiba\\.gemini\\antigravity\\brain\\5c07ca74-9e20-4c3d-8646-3f938d797c28\\.system_generated\\logs\\transcript.jsonl';
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const lines = [];
  for await (const line of rl) {
    if (line.trim()) {
      lines.push(line);
    }
  }

  console.log(`Total lines: ${lines.length}`);
  const lastLines = lines.slice(-20);
  lastLines.forEach((line, index) => {
    try {
      const obj = JSON.parse(line);
      console.log(`\n--- Line ${lines.length - 20 + index} ---`);
      console.log(`Type: ${obj.type}, Source: ${obj.source}, Step: ${obj.step_index}`);
      if (obj.content) {
        console.log('Content (first 300 chars):', String(obj.content).slice(0, 300));
      }
      if (obj.tool_calls) {
        console.log('Tool calls:', JSON.stringify(obj.tool_calls).slice(0, 500));
      }
      if (obj.tool_output) {
        console.log('Tool output (first 300 chars):', String(obj.tool_output).slice(0, 300));
      }
    } catch (e) {
      console.log('JSON parse error on line:', line.slice(0, 100));
    }
  });
}

main().catch(console.error);
