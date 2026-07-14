// 검수용 v3 HTML 생성기 — care_matrix_v3.json → standalone HTML
// 필터 우선순위를 곱슬(1순위) > 굵기(2순위) > 숱(3순위) > 시술횟수(4순위, modifier)로 배치
import { readFileSync, writeFileSync } from "fs";

const data = JSON.parse(readFileSync("care_matrix_v3.json", "utf-8"));

const LABEL = {
  curl: { straight_hair: "직모", wavy_hair: "반곱슬", curly_hair: "강한 곱슬" },
  thickness: { coarse: "굵음", medium_thickness: "보통", fine: "얇음" },
  density: { thick_density: "숱 많음", medium_density: "숱 보통", thin_density: "숱 적음" },
  historyCount: { count_1_2: "1~2회", count_3_4: "3~4회", count_5_6: "5~6회", count_7plus: "7회+" },
};
const CURL_ORDER = ["straight_hair", "wavy_hair", "curly_hair"];

function opts(dim) {
  return Object.entries(LABEL[dim]).map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
}

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>/style 뒤 4문항 케어 문구 v3 — 모질 중심 검수</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    background: #F3F4F6; color: #1F2937;
  }
  header {
    position: sticky; top: 0; z-index: 30; background: #ffffff;
    border-bottom: 1px solid #E5E7EB; padding: 14px 20px;
  }
  header h1 { margin: 0 0 2px; font-size: 16px; }
  header p.sub { margin: 0; font-size: 12px; color: #6B7280; }
  header p.note { margin: 4px 0 0; font-size: 11px; color: #A8884A; font-weight: 700; }

  .toolbar {
    position: sticky; top: 68px; z-index: 29; background: #F9FAFB;
    border-bottom: 1px solid #E5E7EB; padding: 10px 20px;
    display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
  }
  .chip-group { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    border: 1px solid #D1D5DB; background: #fff; border-radius: 999px;
    padding: 5px 12px; font-size: 12px; cursor: pointer; color: #374151;
    user-select: none; white-space: nowrap;
  }
  .chip.active { background: #C8A86B; border-color: #A8884A; color: #1F2937; font-weight: 700; }
  .sel {
    border: 1px solid #D1D5DB; border-radius: 8px; padding: 5px 8px;
    font-size: 12px; background: #fff; color: #374151;
  }
  .reset-btn {
    border: 1px solid #D1D5DB; border-radius: 8px; padding: 5px 12px;
    font-size: 12px; background: #fff; cursor: pointer; color: #6B7280;
  }
  .reset-btn:hover { color: #1F2937; border-color: #9CA3AF; }
  .count-badge { margin-left: auto; font-size: 12px; font-weight: 700; color: #A8884A; white-space: nowrap; }

  .table-wrap { overflow: auto; max-height: calc(100vh - 128px); }
  table { border-collapse: collapse; width: 100%; min-width: 2300px; background: #fff; }
  thead th {
    position: sticky; top: 0; z-index: 10; background: #2F2F2F; color: #F9FAFB;
    text-align: left; padding: 8px 10px; font-size: 11px; font-weight: 700;
    white-space: nowrap; border-right: 1px solid rgba(255,255,255,0.08);
  }
  tbody td {
    padding: 10px; font-size: 12.5px; line-height: 1.55; vertical-align: top;
    border-bottom: 1px solid #E5E7EB; border-right: 1px solid #F1F1F1;
    max-width: 260px; white-space: normal; overflow-wrap: break-word;
  }
  tbody tr:hover { background: #FBF6EA; }
  tbody tr.hidden { display: none; }

  td.id-cell { font-family: monospace; font-size: 10px; color: #9CA3AF; max-width: 150px; word-break: break-all; }
  td.key-cell { font-family: monospace; font-size: 10.5px; color: #6B7280; }
  td.title-cell { font-weight: 700; color: #2F2F2F; }

  ul.bullets { margin: 0; padding-left: 16px; }
  ul.bullets li { margin-bottom: 3px; }
  ul.bullets.tags { list-style: none; padding-left: 0; display: flex; flex-wrap: wrap; gap: 4px; }
  ul.bullets.tags li {
    background: #FBF0DA; color: #8A6D2F; border-radius: 999px; padding: 2px 8px;
    font-size: 11px; font-weight: 700; margin: 0;
  }
  .empty-dash { color: #C4C4C4; }
  .modifier-badge {
    display: inline-block; font-size: 10px; font-weight: 700;
    color: #8A6D2F; background: #FBF0DA; border-radius: 6px; padding: 2px 6px;
    white-space: nowrap;
  }

  textarea.memo {
    width: 220px; min-height: 60px; resize: vertical; font-size: 12px;
    border: 1px solid #E5E7EB; border-radius: 6px; padding: 6px; font-family: inherit;
    background: #FFFDF7;
  }
</style>
</head>
<body>

<header>
  <h1>/style 뒤 4문항 케어 문구 v3 — 모질(곱슬&gt;굵기&gt;숱) 중심 검수</h1>
  <p class="sub">기본 타입 27개(곱슬×굵기×숱) × 시술횟수 4단계 = 108조합. hairTypeKey/hairTypeTitle은 손상도와 무관하게 항상 모질 기준으로 고정됩니다.</p>
  <p class="note">damageModifier/damageCaution/procedureHint만 시술횟수에 따라 달라지고, 나머지는 신규 제안 필드이며 서비스 코드에 아직 반영되지 않았습니다.</p>
</header>

<div class="toolbar">
  <div class="chip-group" id="curlChips">
    <span class="chip active" data-curl="__all__">전체</span>
    ${CURL_ORDER.map(c => `<span class="chip" data-curl="${c}">${LABEL.curl[c]}</span>`).join("")}
  </div>
  <select class="sel" id="thicknessSel"><option value="">굵기 — 전체</option>${opts("thickness")}</select>
  <select class="sel" id="densitySel"><option value="">숱 — 전체</option>${opts("density")}</select>
  <select class="sel" id="historySel"><option value="">시술횟수 — 전체</option>${opts("historyCount")}</select>
  <button class="reset-btn" id="resetBtn">필터 초기화</button>
  <span class="count-badge" id="countBadge"></span>
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>id</th>
        <th>curl</th>
        <th>thickness</th>
        <th>density</th>
        <th>historyCount</th>
        <th>hairTypeKey</th>
        <th>hairTypeTitle</th>
        <th>textureSummary</th>
        <th>styleDirection</th>
        <th>procedureHint</th>
        <th>damageModifier</th>
        <th>damageCaution</th>
        <th>homeCare</th>
        <th>avoid</th>
        <th>salonRequest</th>
        <th>recommendedCareTags</th>
        <th>수정 메모</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>
</div>

<script type="application/json" id="rowData">${JSON.stringify(data)}</script>
<script>
  const DATA = JSON.parse(document.getElementById('rowData').textContent);
  const LABEL = ${JSON.stringify(LABEL)};

  const MEMO_KEY = "styleCareReviewMemosV3";
  let memos = {};
  try { memos = JSON.parse(localStorage.getItem(MEMO_KEY) || "{}"); } catch (e) { memos = {}; }
  function saveMemos() {
    try { localStorage.setItem(MEMO_KEY, JSON.stringify(memos)); } catch (e) { /* noop */ }
  }

  const state = { curls: new Set(), thickness: "", density: "", historyCount: "" };

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function bullets(arr, cls) {
    if (!arr || arr.length === 0) return '<span class="empty-dash">—</span>';
    return '<ul class="bullets' + (cls ? " " + cls : "") + '">' +
      arr.map(s => '<li>' + esc(s) + '</li>').join("") + '</ul>';
  }

  function rowMatches(row) {
    if (state.curls.size > 0 && !state.curls.has(row.curl)) return false;
    if (state.thickness && row.thickness !== state.thickness) return false;
    if (state.density && row.density !== state.density) return false;
    if (state.historyCount && row.historyCount !== state.historyCount) return false;
    return true;
  }

  function render() {
    const tbody = document.getElementById('tbody');
    const frag = document.createDocumentFragment();
    let shown = 0;
    for (const row of DATA) {
      const visible = rowMatches(row);
      if (visible) shown++;
      const tr = document.createElement('tr');
      if (!visible) tr.classList.add('hidden');
      tr.innerHTML =
        '<td class="id-cell">' + esc(row.id) + '</td>' +
        '<td>' + esc(LABEL.curl[row.curl] ?? row.curl) + '</td>' +
        '<td>' + esc(LABEL.thickness[row.thickness] ?? row.thickness) + '</td>' +
        '<td>' + esc(LABEL.density[row.density] ?? row.density) + '</td>' +
        '<td>' + esc(LABEL.historyCount[row.historyCount] ?? row.historyCount) + '</td>' +
        '<td class="key-cell">' + esc(row.hairTypeKey) + '</td>' +
        '<td class="title-cell">' + esc(row.hairTypeTitle) + '</td>' +
        '<td>' + esc(row.textureSummary) + '</td>' +
        '<td>' + esc(row.styleDirection) + '</td>' +
        '<td>' + esc(row.procedureHint) + '</td>' +
        '<td><span class="modifier-badge">' + esc(row.damageModifier) + '</span></td>' +
        '<td>' + esc(row.damageCaution) + '</td>' +
        '<td>' + bullets(row.homeCare) + '</td>' +
        '<td>' + bullets(row.avoid) + '</td>' +
        '<td>' + bullets(row.salonRequest) + '</td>' +
        '<td>' + bullets(row.recommendedCareTags, "tags") + '</td>' +
        '<td></td>';
      const memoTd = tr.lastElementChild;
      const ta = document.createElement('textarea');
      ta.className = 'memo';
      ta.placeholder = '이상한 점, 수정 방향 메모…';
      ta.value = memos[row.id] || "";
      ta.addEventListener('input', () => { memos[row.id] = ta.value; saveMemos(); });
      memoTd.appendChild(ta);
      frag.appendChild(tr);
    }
    tbody.innerHTML = "";
    tbody.appendChild(frag);
    document.getElementById('countBadge').textContent = '표시 중: ' + shown + ' / ' + DATA.length;
  }

  document.getElementById('curlChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const c = chip.dataset.curl;
    if (c === '__all__') {
      state.curls.clear();
      document.querySelectorAll('#curlChips .chip').forEach(el => el.classList.remove('active'));
      chip.classList.add('active');
    } else {
      document.querySelector('#curlChips .chip[data-curl="__all__"]').classList.remove('active');
      if (state.curls.has(c)) { state.curls.delete(c); chip.classList.remove('active'); }
      else { state.curls.add(c); chip.classList.add('active'); }
      if (state.curls.size === 0) {
        document.querySelector('#curlChips .chip[data-curl="__all__"]').classList.add('active');
      }
    }
    render();
  });

  document.getElementById('thicknessSel').addEventListener('change', (e) => { state.thickness = e.target.value; render(); });
  document.getElementById('densitySel').addEventListener('change', (e) => { state.density = e.target.value; render(); });
  document.getElementById('historySel').addEventListener('change', (e) => { state.historyCount = e.target.value; render(); });

  document.getElementById('resetBtn').addEventListener('click', () => {
    state.curls.clear(); state.thickness = ""; state.density = ""; state.historyCount = "";
    document.querySelectorAll('#curlChips .chip').forEach(el => el.classList.remove('active'));
    document.querySelector('#curlChips .chip[data-curl="__all__"]').classList.add('active');
    document.getElementById('thicknessSel').value = "";
    document.getElementById('densitySel').value = "";
    document.getElementById('historySel').value = "";
    render();
  });

  render();
</script>
</body>
</html>
`;

writeFileSync("care_matrix_review_v3.html", html, "utf-8");
console.log("저장 완료: care_matrix_review_v3.html (" + data.length + "행)");
