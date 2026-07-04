import { readFileSync } from "fs";
const landmarks = JSON.parse(readFileSync("test-faces-landmarks.json", "utf-8"));
function keyOf(file) { return file.match(/^([a-z]+)_/)[1]; }
function hDist(a, b) { return Math.abs(b.x - a.x); }
function vDist(a, b) { return Math.abs(b.y - a.y); }

const files = Object.keys(landmarks);

function buildData(jawIdx, foreheadIdx) {
  return files.map((file) => {
    const oval = landmarks[file].oval;
    const cheekW = hDist(oval[8], oval[28]);
    return {
      file, shape: keyOf(file),
      jaw:      hDist(oval[jawIdx], oval[36 - jawIdx]) / cheekW,
      forehead: hDist(oval[foreheadIdx], oval[36 - foreheadIdx]) / cheekW,
      length:   vDist(oval[0], oval[18]) / cheekW,
    };
  });
}

function classify(r, T) {
  const taper = r.forehead - r.jaw;
  if (r.jaw < T.vlineJawMax && taper > T.heartTaperMin) {
    return r.forehead < T.narrowForehead ? "diamond" : "heart";
  }
  if (r.jaw > T.wideJaw) {
    return r.forehead > T.wideForehead ? "hexagon" : "square";
  }
  if (r.length > T.longFace) return "oblong";
  if (r.length < T.shortFace) return "round";
  if (r.forehead < T.narrowForehead) return "peanut";
  return "oval";
}

function accuracy(data, T) {
  let correct = 0;
  const confusion = {};
  for (const r of data) {
    const pred = classify(r, T);
    if (pred === r.shape) correct++;
    else (confusion[r.shape] ??= []).push(`${r.file}→${pred}`);
  }
  return { acc: correct / data.length, confusion, correct };
}

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function fit(data, iters = 3000, seed = 42) {
  const rand = seededRandom(seed);
  let T = {
    vlineJawMax: 0.63, heartTaperMin: 0.2, narrowForehead: 0.87,
    wideJaw: 0.66, wideForehead: 0.9, longFace: 1.1, shortFace: 0.85,
  };
  let best = { T: { ...T }, ...accuracy(data, T) };
  for (let i = 0; i < iters; i++) {
    const candidate = { ...best.T };
    const keys = Object.keys(candidate);
    const k = keys[Math.floor(rand() * keys.length)];
    candidate[k] = +(candidate[k] + (rand() - 0.5) * 0.05).toFixed(4);
    const res = accuracy(data, candidate);
    if (res.acc > best.acc) best = { T: candidate, ...res };
  }
  return best;
}

// jaw 후보 9~17, forehead 후보 1~7 전수 조합 탐색 — 최고 정확도 조합 탐색
let globalBest = null;
for (let jawIdx = 9; jawIdx <= 17; jawIdx++) {
  for (let foreheadIdx = 1; foreheadIdx <= 7; foreheadIdx++) {
    const data = buildData(jawIdx, foreheadIdx);
    const result = fit(data, 1500);
    if (!globalBest || result.acc > globalBest.acc) {
      globalBest = { jawIdx, foreheadIdx, ...result };
    }
  }
}

console.log(`최고 조합: jawIdx=${globalBest.jawIdx}(mirror ${36-globalBest.jawIdx}), foreheadIdx=${globalBest.foreheadIdx}(mirror ${36-globalBest.foreheadIdx})`);
console.log(`정확도: ${globalBest.correct}/24 (${(globalBest.acc*100).toFixed(1)}%)`);
console.log("임계값:", JSON.stringify(globalBest.T, null, 2));
console.log("오답:", JSON.stringify(globalBest.confusion, null, 2));
