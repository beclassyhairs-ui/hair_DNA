// test-faces-landmarks.json (36점 oval 원본 좌표) 를 이용해
// 132/361, 71/301 대신 쓸 수 있는 "턱/이마" 후보 랜드마크 페어를 전수 탐색한다.
//
// FACE_OVAL_SEQUENCE 인덱스(0~35, 폐곡선):
//   0=top(10) ... 8=Rcheek(454) ... 18=chin(152) ... 28=Lcheek(234) ... back to 0
// 대칭쌍: index i (우측, 1~17) ↔ index(36-i) (좌측)
//   i=1..7  → top~cheek 구간 (이마/관자놀이 후보)
//   i=9..17 → cheek~chin 구간 (턱 후보)

import { readFileSync } from "fs";

const landmarks = JSON.parse(readFileSync("test-faces-landmarks.json", "utf-8"));
const SHAPES = ["square","oblong","round","peanut","heart","diamond","hexagon","oval"];

function keyOf(file) {
  return file.match(/^([a-z]+)_/)[1];
}

function hDist(a, b) { return Math.abs(b.x - a.x); }

const files = Object.keys(landmarks);
console.log(`로드된 사진 수: ${files.length}`);

// 후보 인덱스별로 파일별 ratio 계산 후 그룹 통계 출력
for (const i of [1,2,3,4,5,6,7,9,10,11,12,13,14,15,16,17]) {
  const mirror = 36 - i;
  const region = i <= 7 ? "forehead후보" : "jaw후보";
  const byShape = {};
  for (const file of files) {
    const oval = landmarks[file]?.oval;
    if (!oval) continue;
    const cheekW = hDist(oval[8], oval[28]);
    const ratio = hDist(oval[i], oval[mirror]) / cheekW;
    const shape = keyOf(file);
    (byShape[shape] ??= []).push(ratio);
  }
  const line = SHAPES.map(s => {
    const arr = byShape[s] ?? [];
    const avg = arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(3) : "-";
    return `${s}:${avg}`;
  }).join("  ");
  console.log(`[idx ${i}/${mirror}] (${region})  ${line}`);
}
