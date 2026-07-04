import { readFileSync } from "fs";
const landmarks = JSON.parse(readFileSync("test-faces-landmarks.json", "utf-8"));
function keyOf(file) { return file.match(/^([a-z]+)_/)[1]; }
function hDist(a, b) { return Math.abs(b.x - a.x); }
function vDist(a, b) { return Math.abs(b.y - a.y); }

const rows = [];
for (const file of Object.keys(landmarks)) {
  const oval = landmarks[file].oval;
  const cheekW = hDist(oval[8], oval[28]);
  const jaw2      = hDist(oval[13], oval[23]) / cheekW;   // 365/136
  const forehead2 = hDist(oval[4],  oval[32]) / cheekW;   // 284/54
  const length2   = vDist(oval[0],  oval[18]) / cheekW;   // top/chin (기존과 동일 인덱스)
  const taper2    = forehead2 - jaw2;
  rows.push({ file, shape: keyOf(file), jaw2: +jaw2.toFixed(3), forehead2: +forehead2.toFixed(3), length2: +length2.toFixed(3), taper2: +taper2.toFixed(3) });
}
rows.sort((a,b) => a.shape.localeCompare(b.shape));
console.log("file\tshape\tjaw2\tforehead2\tlength2\ttaper2");
rows.forEach(r => console.log(`${r.file}\t${r.shape}\t${r.jaw2}\t${r.forehead2}\t${r.length2}\t${r.taper2}`));
