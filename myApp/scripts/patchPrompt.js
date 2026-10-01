const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'functions', 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldBlock = `        const prompt = \`
Compare these two hair progress photos taken \${prevDay} days apart.
Photo 1 = Day \${prevDay}, Photo 2 = Day \${currentDay}.
Return a single concise improvement metric string, e.g. "Density increased by 3% since Day \${prevDay}".
Focus on: density, thickness, hairline, scalp health.
Be specific and realistic. Return ONLY the metric string, no JSON.
\`;

        // We only have the current image as base64; use it for the prompt`;

const newBlock = `        // WELLNESS-STYLE prompt — avoids fake clinical precision
        // (lighting/angle/wetness make percentage claims unreliable)
        const prompt = [
          \`You are a wellness coach reviewing a hair care progress photo on Day \${currentDay} of a 28-day routine.\`,
          \`The user has consistently followed: scalp massage, topical treatment, 2.5L daily hydration, and vitamins.\`,
          \`Write ONE motivational wellness-style insight (max 15 words).\`,
          \`Focus on: habit consistency, visible shine, routine adherence, or scalp wellness.\`,
          \`DO NOT make clinical claims (no percentages, no density numbers — photo conditions vary).\`,
          \`Example: "Consistency since Day \${prevDay} is showing — your routine is building real momentum."\`,
          \`Return ONLY the insight sentence. No quotes. No JSON.\`,
        ].join("\\n");`;

// Try CRLF first, then LF
const oldCRLF = oldBlock.replace(/\n/g, '\r\n');
if (content.includes(oldCRLF)) {
  content = content.replace(oldCRLF, newBlock.replace(/\n/g, '\r\n'));
  console.log('Replaced using CRLF match');
} else if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  console.log('Replaced using LF match');
} else {
  // Find the prompt lines by searching key unique phrases
  const start = content.indexOf('Compare these two hair progress photos taken');
  const end = content.indexOf('// We only have the current image as base64');
  if (start === -1 || end === -1) {
    console.error('Could not locate prompt block. Start:', start, 'End:', end);
    process.exit(1);
  }
  // Back up to the backtick start
  const promptStart = content.lastIndexOf('const prompt = `', start);
  content = content.slice(0, promptStart) + newBlock + '\r\n' + content.slice(end);
  console.log('Replaced using index search at', promptStart);
}

// Also fix fallback messages
content = content
  .replace(
    /improvementMetric = `Progress captured on Day \${currentDay}`/,
    "improvementMetric = `Consistency is your superpower — keep showing up, Day \\${currentDay}!`"
  )
  .replace(
    /improvementMetric = `Day \${currentDay} baseline photo saved`/,
    "improvementMetric = `Day \\${currentDay} baseline captured — great start to your routine!`"
  );

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done. File updated successfully.');
