// 검수용 v3 — 모질(곱슬>굵기>숱) 중심 구조, 손상도는 modifier로만 사용
// 기본 타입 27개(curl×thickness×density) × historyCount 4단계 = 108개
// hairTypeKey/hairTypeTitle은 손상도와 무관하게 항상 texture 기준으로 고정된다.
import { writeFileSync } from "fs";

const CURL = ["straight_hair", "wavy_hair", "curly_hair"];
const THICKNESS = ["coarse", "medium_thickness", "fine"];
const DENSITY = ["thick_density", "medium_density", "thin_density"];
const HISTORY = ["count_1_2", "count_3_4", "count_5_6", "count_7plus"];

const CURL_CODE = { straight_hair: "straight", wavy_hair: "wavy", curly_hair: "curly" };
const THICKNESS_CODE = { coarse: "coarse", medium_thickness: "medium", fine: "fine" };
const DENSITY_CODE = { thick_density: "dense", medium_density: "medium", thin_density: "sparse" };

// ── 27개 기본 타입 — curl(1순위) > thickness(2순위) > density(3순위) ──────────────
// title/textureSummary/styleDirection은 손상도 언급 없이 오직 모질만 설명한다.
const BASE_TYPES = {
  // ── 직모 ──────────────────────────────────────────────────────────────────
  "straight_hair|coarse|thick_density": {
    title: "차분하지만 무거운 직모",
    texture: "직모에 숱도 많고 굵기도 있어서 힘 있고 차분한 인상을 주는 모발이에요.",
    direction: "다만 그만큼 무겁고 답답하게 떨어지기 쉬워서, 양감을 덜어내는 레이어드 커트와 끝선 정리로 무게감을 조절하는 방향이 좋아요. 정수리 볼륨을 살려주면 답답한 인상도 함께 줄어들어요.",
  },
  "straight_hair|coarse|medium_density": {
    title: "결이 좋은 차분한 직모",
    texture: "직모에 굵기가 있고 숱은 보통 수준이라 안정적으로 힘 있는 모발이에요.",
    direction: "무게감이 아주 부담스러운 정도는 아니지만, 끝선에 가벼운 레이어드를 더하면 답답함 없이 결을 살릴 수 있어요.",
  },
  "straight_hair|coarse|thin_density": {
    title: "숱은 적지만 힘 있는 직모",
    texture: "직모에 굵기가 있는데 숱은 적은, 비교적 드문 조합이에요. 실제 촉감을 함께 확인해보는 게 더 정확해요.",
    direction: "숱이 적게 느껴진다면 끝선의 두께감을 살리는 커트와 정수리 볼륨을 보완하는 방향을 함께 안내드려요.",
  },
  "straight_hair|medium_thickness|thick_density": {
    title: "볼륨감 있는 표준 직모",
    texture: "직모에 굵기는 보통이고 숱이 많아서 자연스럽게 볼륨이 살아있는 모발이에요.",
    direction: "숱이 많은 만큼 겉머리 부분만 가볍게 틴닝하면 무게감 없이 볼륨을 유지할 수 있어요.",
  },
  "straight_hair|medium_thickness|medium_density": {
    title: "밸런스가 좋은 직모",
    texture: "직모에 굵기와 숱 모두 보통 수준이라 스타일 소화력이 좋은 모발이에요.",
    direction: "특별한 보정 없이도 다양한 커트와 스타일을 편하게 시도해볼 수 있어요.",
  },
  "straight_hair|medium_thickness|thin_density": {
    title: "볼륨이 아쉬운 직모",
    texture: "직모에 굵기는 보통이지만 숱이 적어 볼륨이 아쉽게 느껴지는 모발이에요.",
    direction: "뿌리 볼륨을 살리는 드라이 방향과 가벼운 C컬·S컬 스타일링이 볼륨감을 보완해줘요.",
  },
  "straight_hair|fine|thick_density": {
    title: "숱은 많지만 힘이 없는 직모",
    texture: "직모에 숱은 많은데 모발이 얇아서 힘이 약하게 느껴지는 모발이에요.",
    direction: "숱은 충분하니 무게감을 줄이는 가벼운 커트와 가벼운 볼륨 제품으로 힘 있어 보이게 스타일링하는 방향이 좋아요.",
  },
  "straight_hair|fine|medium_density": {
    title: "얇고 부드러운 직모",
    texture: "직모에 숱은 보통이지만 모발이 얇아 부드럽고 잔잔한 인상을 주는 모발이에요.",
    direction: "가벼운 볼륨 제품과 뿌리 볼륨 드라이로 스타일에 생기를 더할 수 있어요.",
  },
  "straight_hair|fine|thin_density": {
    title: "볼륨 유지가 최우선인 직모",
    texture: "직모에 모발이 얇고 숱도 적어 볼륨을 유지하기가 가장 까다로운 조합이에요.",
    direction: "무거운 오일이나 크림보다는 가벼운 볼륨 제품, 뿌리 볼륨 드라이, C컬·S컬 방향이 잘 맞아요.",
  },
  // ── 반곱슬 ──────────────────────────────────────────────────────────────────
  "wavy_hair|coarse|thick_density": {
    title: "볼륨감 있는 반곱슬",
    texture: "반곱슬에 굵기와 숱이 모두 있어서 웨이브 결과 볼륨이 함께 살아있는 모발이에요.",
    direction: "웨이브 결을 정리해주는 다운펌으로 형태를 잡거나, 겉머리만 가볍게 틴닝해 무게감을 조절하는 방향이 좋아요.",
  },
  "wavy_hair|coarse|medium_density": {
    title: "결 있는 자연스러운 반곱슬",
    texture: "반곱슬에 굵기가 있고 숱은 보통이라 자연스러운 웨이브 결이 살아있는 모발이에요.",
    direction: "습한 날엔 가벼운 크림으로 결을 정돈하고, 맑은 날엔 웨이브를 그대로 살리는 스타일링이 잘 맞아요.",
  },
  "wavy_hair|coarse|thin_density": {
    title: "숱은 적지만 웨이브가 살아있는 반곱슬",
    texture: "반곱슬에 굵기는 있지만 숱이 적어 웨이브로 볼륨을 보완하기 좋은 모발이에요.",
    direction: "웨이브를 눌러 펴기보다는 웨이브 자체로 볼륨을 살리는 방향이 더 잘 맞아요.",
  },
  "wavy_hair|medium_thickness|thick_density": {
    title: "표준 반곱슬",
    texture: "반곱슬에 굵기와 숱 모두 보통 수준으로 웨이브와 볼륨의 균형이 좋은 모발이에요.",
    direction: "다운펌으로 웨이브를 정돈하거나, 자연스러운 웨이브를 그대로 살리는 스타일링 둘 다 잘 맞아요.",
  },
  "wavy_hair|medium_thickness|medium_density": {
    title: "밸런스 좋은 반곱슬",
    texture: "반곱슬에 굵기와 숱이 모두 무난해 스타일 소화력이 좋은 모발이에요.",
    direction: "큰 보정 없이 웨이브 결 정돈에만 집중해도 스타일이 깔끔하게 잡혀요.",
  },
  "wavy_hair|medium_thickness|thin_density": {
    title: "볼륨이 아쉬운 반곱슬",
    texture: "반곱슬에 굵기는 보통이지만 숱이 적어 볼륨이 아쉬운 모발이에요.",
    direction: "웨이브 결을 살리면서 뿌리 볼륨을 함께 보완하는 스타일링이 좋아요.",
  },
  "wavy_hair|fine|thick_density": {
    title: "숱은 많지만 힘이 없는 반곱슬",
    texture: "반곱슬에 숱은 많은데 모발이 얇아 웨이브 유지력이 약한 모발이에요.",
    direction: "웨이브 유지력을 위해 부분 다운펌을 고려하거나, 가벼운 무스로 웨이브를 살리는 방향이 좋아요.",
  },
  "wavy_hair|fine|medium_density": {
    title: "얇고 부드러운 반곱슬",
    texture: "반곱슬에 숱은 보통이지만 모발이 얇아 가볍고 부드러운 인상을 주는 모발이에요.",
    direction: "무거운 제품보다는 가벼운 크림으로 웨이브를 살리는 스타일링이 잘 맞아요.",
  },
  "wavy_hair|fine|thin_density": {
    title: "볼륨과 웨이브를 동시에 살려야 하는 반곱슬",
    texture: "반곱슬에 모발이 얇고 숱도 적어 볼륨과 웨이브를 함께 신경 써야 하는 모발이에요.",
    direction: "전체 다운펌보다는 부분 정돈과 뿌리 볼륨을 함께 챙기는 방향이 더 잘 맞아요.",
  },
  // ── 강한 곱슬 ────────────────────────────────────────────────────────────────
  "curly_hair|coarse|thick_density": {
    title: "부피감이 큰 곱슬 모발",
    texture: "곱슬 기운이 강하고 굵기와 숱도 있어서 부피감이 크게 느껴지는 모발이에요.",
    direction: "곱슬이 부피감과 지저분함으로 보일 수 있어서, 무조건 볼륨을 살리기보다 먼저 곱슬의 부피와 퍼짐을 정돈하는 방향이 중요해요.",
  },
  "curly_hair|coarse|medium_density": {
    title: "볼륨감 있는 곱슬 모발",
    texture: "곱슬 기운이 강하고 굵기가 있어 볼륨감이 뚜렷한 모발이에요.",
    direction: "부피 정돈과 결 관리를 함께 챙기면 곱슬 특유의 볼륨을 부담스럽지 않게 유지할 수 있어요.",
  },
  "curly_hair|coarse|thin_density": {
    title: "곱슬은 강하지만 숱이 적은 모발",
    texture: "곱슬 기운은 강한데 숱이 적어 부피와 볼륨이 동시에 고민되는 모발이에요.",
    direction: "곱슬을 완전히 눌러 없애면 머리가 더 없어 보일 수 있어서, 볼륨을 살리는 컬감이나 층, 루트 볼륨을 함께 살리는 방향이 중요해요.",
  },
  "curly_hair|medium_thickness|thick_density": {
    title: "부피감 있는 표준 곱슬 모발",
    texture: "곱슬 기운이 강하고 숱이 많아 전체적으로 부피가 크게 느껴지는 모발이에요.",
    direction: "부피 정돈을 우선하면서도 정수리는 볼륨을 유지하는 방향으로 균형을 잡는 게 좋아요.",
  },
  "curly_hair|medium_thickness|medium_density": {
    title: "밸런스 좋은 곱슬 모발",
    texture: "곱슬 기운과 굵기, 숱이 모두 무난한 수준으로 관리 부담이 적은 모발이에요.",
    direction: "결 정돈 중심의 관리만으로도 스타일이 깔끔하게 잡혀요.",
  },
  "curly_hair|medium_thickness|thin_density": {
    title: "숱이 적은 표준 곱슬 모발",
    texture: "곱슬 기운은 강한데 숱이 적어 볼륨이 아쉽게 느껴지는 모발이에요.",
    direction: "곱슬을 눌러 없애기보다 볼륨을 살리는 컬감이나 층으로 정돈하는 방향이 중요해요.",
  },
  "curly_hair|fine|thick_density": {
    title: "숱은 많지만 얇아서 힘이 없는 곱슬 모발",
    texture: "곱슬 기운이 강하고 숱은 많은데 모발이 얇아 힘이 약하게 느껴지는 모발이에요.",
    direction: "곱슬을 잡으면 깔끔해질 수 있지만 전체 매직은 볼륨감을 너무 죽일 수 있어서, 볼륨을 남기는 아이롱 정돈이나 부분 매직 방향이 더 잘 맞을 수 있어요.",
  },
  "curly_hair|fine|medium_density": {
    title: "얇고 부드러운 곱슬 모발",
    texture: "곱슬 기운이 강하지만 모발이 얇아 부드럽고 가벼운 인상을 주는 모발이에요.",
    direction: "전체 매직보다는 부분 매직과 뿌리 볼륨 유지 방향이 더 잘 맞을 수 있어요.",
  },
  "curly_hair|fine|thin_density": {
    title: "얇고 숱도 적은 곱슬 모발",
    texture: "곱슬 기운은 강한데 모발이 얇고 숱도 적어 볼륨을 세심하게 챙겨야 하는 모발이에요.",
    direction: "곱슬을 완전히 누르기보다 볼륨을 최우선으로 살리는 부분 정돈 방향이 중요해요.",
  },
};

// ── historyCount → 4단계 tier (0=낮음 ... 3=신중) — 손상도는 modifier 전용 ──────────
const TIER_OF = { count_1_2: 0, count_3_4: 1, count_5_6: 2, count_7plus: 3 };
const DAMAGE_MODIFIER = ["손상 이력 적음", "손상 이력 보통", "손상 이력 잦음 — 주의 단계", "손상 이력 많음 — 신중 단계"];
const DAMAGE_CAUTION = [
  "지금은 시술 이력이 적어 특별히 주의할 부분은 없어요.",
  "다만 시술을 이어갈 계획이라면 트리트먼트 주기를 함께 챙기면 좋아요.",
  "다만 시술 이력이 잦은 편이라 강한 정돈 시술은 신중하게 접근하는 것이 좋아요.",
  "다만 시술 이력이 많아 강한 정돈 시술은 신중하게 접근하는 것이 좋아요.",
];

// curl 그룹별 대표 정돈 시술 이름 — procedureHint에서 사용
const PROCEDURE_NAME = {
  straight_hair: { open: "볼륨매직이나 디지털펌 같은 볼륨 시술", cautious: "가벼운 레이어드 커트나 부분 볼륨" },
  wavy_hair:     { open: "다운펌이나 웨이브 세팅 시술", cautious: "부분 정돈이나 약한 세팅" },
  curly_hair:    { open: "볼륨매직이나 매직세팅 같은 곱슬 정돈 시술", cautious: "부분 정돈이나 약한 정돈" },
};
function procedureHintFor(curl, tier) {
  const name = PROCEDURE_NAME[curl];
  if (tier === 0) return `손상 이력이 적어서 ${name.open}을 편하게 고려해볼 수 있어요.`;
  if (tier === 1) return `${name.open}을 고려할 수 있는 상태예요. 트리트먼트를 함께 챙기면 결과가 더 오래가요.`;
  if (tier === 2) return `전체 시술보다는 ${name.cautious}부터 시작해보는 걸 추천해요.`;
  return `강한 정돈 시술보다 홈케어로 컨디션을 먼저 회복한 뒤 ${name.cautious} 정도로 시작하는 걸 추천해요.`;
}
function salonRequestCurlClauseFor(curl, tier) {
  const bucket = tier <= 1 ? "open" : "cautious";
  const OPEN = {
    straight_hair: "\"양감을 가볍게 조절하는 레이어드 커트나 볼륨매직으로 상담받고 싶어요.\"",
    wavy_hair:     "\"웨이브 결을 살리는 다운펌이나 웨이브 세팅으로 상담받고 싶어요.\"",
    curly_hair:    "\"곱슬 부피를 정돈하는 볼륨매직이나 매직세팅으로 상담받고 싶어요.\"",
  };
  const CAUTIOUS = {
    straight_hair: "\"강한 펌보다는 가벼운 레이어드 커트나 부분 볼륨으로 진행하고 싶어요.\"",
    wavy_hair:     "\"전체 다운펌보다는 부분 정돈이나 약한 세팅으로 진행하고 싶어요.\"",
    curly_hair:    "\"전체 매직보다는 부분 정돈이나 약한 정돈으로 진행하고 싶어요.\"",
  };
  return bucket === "open" ? OPEN[curl] : CAUTIOUS[curl];
}

// ── homeCare 구성 요소 — 굵기/숱 기반 + 손상 tier 강도 ───────────────────────────
const THICKNESS_CARE = {
  coarse: "굵은 모발이라 트리트먼트를 3분 정도 얹어두면 흡수가 더 잘 돼요.",
  medium_thickness: "보통 굵기라 평소 쓰는 제품 양 그대로 사용해도 괜찮아요.",
  fine: "얇은 모발이라 무거운 제품보다는 가벼운 에센스를 끝부분에만 발라주면 좋아요.",
};
const DENSITY_CARE = {
  thick_density: "숱이 많은 편이니 밑머리 볼륨은 가볍게 눌러 정돈하면 하루 종일 깔끔하게 유지돼요.",
  medium_density: "숱이 적당한 편이라 평소 드라이 루틴 그대로 유지해도 충분해요.",
  thin_density: "숱이 적은 편이니 뿌리부터 들어올리며 드라이하면 볼륨감을 살리기 좋아요.",
};
const TIER_CARE = [
  "지금처럼 관리하면 충분해요.",
  "주 1회 정도 트리트먼트를 더해주면 좋아요.",
  "단백질 트리트먼트 빈도를 조금 늘려서 회복을 도와주세요.",
  "두피에 자극이 적은 홈케어로 컨디션 회복을 우선해보세요.",
];

// ── avoid — 최대 3 bullet, curl + tier + (선택) density ─────────────────────────
const CURL_AVOID = {
  straight_hair: "고온 고데기를 매일 쓰기보다는 한 단계 낮은 온도로 스타일링해보세요.",
  wavy_hair:     "물기가 많을 때 세게 비비며 말리기보다는 수건으로 가볍게 눌러 닦아주세요.",
  curly_hair:    "브러시로 빗어 내리기보다는 손끝으로 결을 따라 정돈해주세요.",
};
const TIER_AVOID = [
  "지금처럼 시술 빈도가 적은 편이면 특별히 피할 건 없어요.",
  "이번 주는 새 펌이나 염색보다는 트리트먼트 위주로 관리해보면 좋아요.",
  "다음 시술까지 2주 정도 간격을 두면 모발이 회복할 시간을 가질 수 있어요.",
  "당분간은 전체 염색이나 펌보다 두피 자극이 적은 홈케어를 먼저 챙겨보세요.",
];
const DENSITY_AVOID_EXTRA = "무거운 오일 타입 제품은 뿌리보다 끝부분에만 살짝 사용해보세요.";

const DENSITY_SALON = {
  thick_density:  "\"겉머리는 가볍게 틴닝해서 무게감만 살짝 줄여주세요.\"",
  medium_density: "\"지금 밸런스를 유지하는 선에서 다듬어주세요.\"",
  thin_density:   "\"뿌리 볼륨을 살려주는 시술도 함께 상담받고 싶어요.\"",
};

// ── recommendedCareTags — 모질(곱슬/굵기/숱) 우선, 손상은 마지막에만 보조로 ─────────
function buildCareTags(curl, thickness, density, historyCount) {
  const tags = [];
  if (curl === "curly_hair") tags.push("#곱슬케어");
  else if (curl === "wavy_hair") tags.push("#반곱슬케어");
  if (thickness === "fine") tags.push("#가는모");
  else if (thickness === "coarse") tags.push("#굵은모");
  if (density === "thin_density") tags.push("#볼륨필요");
  else if (density === "thick_density") tags.push("#숱많음");
  if (historyCount === "count_5_6" || historyCount === "count_7plus") tags.push("#손상케어");
  return tags.length > 0 ? tags : ["#건강모"];
}

const rows = [];
for (const curl of CURL) {
  for (const thickness of THICKNESS) {
    for (const density of DENSITY) {
      const base = BASE_TYPES[`${curl}|${thickness}|${density}`];
      if (!base) throw new Error(`BASE_TYPES 누락: ${curl}|${thickness}|${density}`);
      for (const historyCount of HISTORY) {
        const tier = TIER_OF[historyCount];

        const homeCare = [DENSITY_CARE[density], THICKNESS_CARE[thickness], TIER_CARE[tier]];

        const avoid = [CURL_AVOID[curl], TIER_AVOID[tier]];
        if (density === "thin_density") avoid.push(DENSITY_AVOID_EXTRA);

        const salonRequest = [salonRequestCurlClauseFor(curl, tier), DENSITY_SALON[density]];

        rows.push({
          id: `${curl}__${thickness}__${density}__${historyCount}`,
          curl, thickness, density, historyCount,
          hairTypeKey: `${CURL_CODE[curl]}_${THICKNESS_CODE[thickness]}_${DENSITY_CODE[density]}`,
          hairTypeTitle: base.title,
          textureSummary: base.texture,
          styleDirection: base.direction,
          procedureHint: procedureHintFor(curl, tier),
          damageModifier: DAMAGE_MODIFIER[tier],
          damageCaution: DAMAGE_CAUTION[tier],
          homeCare,
          avoid: avoid.slice(0, 3),
          salonRequest,
          recommendedCareTags: buildCareTags(curl, thickness, density, historyCount),
        });
      }
    }
  }
}

console.log(`총 ${rows.length}개 조합 생성 (기대값 27×4=108)`);
const titleSet = new Set(rows.map(r => r.hairTypeTitle));
console.log(`고유 hairTypeTitle 개수: ${titleSet.size} (기대값 27)`);
const avoidOver3 = rows.filter(r => r.avoid.length > 3).length;
console.log(`avoid 3개 초과 row: ${avoidOver3} (반드시 0)`);
// 금지 표현 스캔
const BANNED = ["망가져요", "안 됩니다", "안돼요", "불가능", "어려워요", "어렵습니다"];
let bannedHits = 0;
for (const r of rows) {
  const blob = JSON.stringify(r);
  for (const w of BANNED) if (blob.includes(w)) { bannedHits++; console.warn("금지어 발견:", w, r.id); }
}
console.log(`금지 표현 검출 건수: ${bannedHits} (반드시 0)`);

writeFileSync("care_matrix_v3.json", JSON.stringify(rows, null, 2), "utf-8");

const FIELDS = [
  "id","curl","thickness","density","historyCount",
  "hairTypeKey","hairTypeTitle","textureSummary","styleDirection",
  "procedureHint","damageModifier","damageCaution",
  "homeCare","avoid","salonRequest","recommendedCareTags",
];
function csvCell(v) {
  const s = Array.isArray(v) ? v.join(" / ") : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}
const csvLines = [FIELDS.join(",")];
for (const r of rows) csvLines.push(FIELDS.map(k => csvCell(r[k])).join(","));
writeFileSync("care_matrix_v3.csv", csvLines.join("\n"), "utf-8");

const mdHeader = `| ${FIELDS.join(" | ")} |`;
const mdSep = `| ${FIELDS.map(() => "---").join(" | ")} |`;
const mdLines = [mdHeader, mdSep];
for (const r of rows) {
  mdLines.push(`| ${FIELDS.map(k => {
    const v = r[k];
    const s = Array.isArray(v) ? v.join("<br>") : String(v);
    return s.replace(/\|/g, "\\|");
  }).join(" | ")} |`);
}
writeFileSync("care_matrix_v3.md", mdLines.join("\n"), "utf-8");

console.log("저장 완료: care_matrix_v3.json / .csv / .md");
