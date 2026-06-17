// ============================================================================
// Google Sheets 연동 — 진단 데이터 행(Row) 추가
// 환경변수:
//   GOOGLE_SHEETS_ID             — 스프레드시트 ID (URL /d/XXX/edit 부분)
//   GOOGLE_SERVICE_ACCOUNT_EMAIL — 서비스 계정 이메일
//   GOOGLE_PRIVATE_KEY           — 서비스 계정 비공개 키 (\n 포함)
// ============================================================================

import { google } from "googleapis";

export const HEADERS = [
  "timestamp",
  "photoUrl",
  "age",
  "mainConcern",
  "extraConcerns",
  "curl",
  "parting",
  "dryHabit",
  "bangs",
  "thickness",
  "density",
  "damage",
  "history",
  "treatmentCounts",
  "length",
  "mood",
  "design",
  "layer",
  "volumePositions",
  "volumeBalance",
];

export interface DiagnosisSubmission {
  photoUrl: string;
  answers: Record<string, string | string[]>;
  treatmentCounts: Record<string, number>;
}

// ── 환경변수 유효성 검사 ────────────────────────────────────────────────────
function validateEnv(): { ok: true } | { ok: false; missing: string[]; details: string } {
  const missing: string[] = [];
  const details: string[] = [];

  if (!process.env.GOOGLE_SHEETS_ID) {
    missing.push("GOOGLE_SHEETS_ID");
  }
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  }

  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  if (!rawKey) {
    missing.push("GOOGLE_PRIVATE_KEY");
  } else {
    // \n 이스케이프 처리 여부 진단
    const hasLiteralNewline = rawKey.includes("\n");
    const hasEscapedNewline = rawKey.includes("\\n");

    if (!hasLiteralNewline && !hasEscapedNewline) {
      details.push(
        "GOOGLE_PRIVATE_KEY에 줄바꿈(\\n 또는 실제 개행)이 없습니다. " +
        ".env.local에서 키 값을 따옴표로 감싸고 \\n을 포함했는지 확인하세요.",
      );
    }
    if (!rawKey.includes("BEGIN RSA PRIVATE KEY") && !rawKey.includes("BEGIN PRIVATE KEY")) {
      details.push(
        "GOOGLE_PRIVATE_KEY가 올바른 PEM 형식이 아닙니다. " +
        "'-----BEGIN PRIVATE KEY-----' 로 시작해야 합니다.",
      );
    }
  }

  if (missing.length > 0 || details.length > 0) {
    return {
      ok: false,
      missing,
      details: [
        missing.length > 0 ? `누락된 환경변수: ${missing.join(", ")}` : "",
        ...details,
      ]
        .filter(Boolean)
        .join(" | "),
    };
  }

  return { ok: true };
}

// ── JWT 인증 객체 생성 ─────────────────────────────────────────────────────
function getAuth() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  // .env.local에서 \n이 문자열 이스케이프로 저장된 경우 실제 개행으로 변환
  const privateKey = rawKey.replace(/\\n/g, "\n");

  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

// ── 직렬화 헬퍼 ───────────────────────────────────────────────────────────
function stringify(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value.join(", ") : value;
}

function stringifyCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}:${n}회`)
    .join(", ");
}

// ── 메인 함수 ──────────────────────────────────────────────────────────────
export async function appendDiagnosisRow(data: DiagnosisSubmission): Promise<void> {
  const tag = "[sheets]";

  // 1) 환경변수 사전 검증
  const envCheck = validateEnv();
  if (!envCheck.ok) {
    const msg = `${tag} ❌ 환경변수 오류 → ${envCheck.details}`;
    console.error(msg);
    throw new Error(msg);
  }

  const sheetsId = process.env.GOOGLE_SHEETS_ID!;
  console.log(`${tag} 📋 시트 ID: ${sheetsId.slice(0, 10)}...`);
  console.log(`${tag} 📧 서비스 계정: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);

  // 2) 인증 + Sheets 클라이언트 초기화
  let auth: ReturnType<typeof getAuth>;
  try {
    auth = getAuth();
    console.log(`${tag} 🔑 JWT 인증 객체 생성 완료`);
  } catch (authErr) {
    console.error(`${tag} ❌ JWT 인증 객체 생성 실패:`, authErr);
    throw authErr;
  }

  const sheets = google.sheets({ version: "v4", auth });

  // 3) 행 데이터 구성
  const a = data.answers;
  const row = [
    new Date().toISOString(),
    data.photoUrl,
    stringify(a.q1_age),
    stringify(a.q2_concern),
    stringify(a.q2b_extra_concern),
    stringify(a.q3_curl),
    // q4_part: left/right → "side_part"으로 정규화
    normalizePartingForSheet(stringify(a.q4_part)),
    stringify(a.q5_dry),
    stringify(a.q6_bangs),
    stringify(a.q7_thickness),
    stringify(a.q8_density),
    stringify(a.q9_damage),
    stringify(a.q10_history),
    stringifyCounts(data.treatmentCounts),
    stringify(a.q11_length),
    stringify(a.q12_mood),
    stringify(a.q13_design),
    stringify(a.q14_layer),
    stringify(a.q15_volume),
    stringify(a.q16_volume_balance),
  ];

  console.log(`${tag} 📝 기록할 행 데이터:`, {
    timestamp: row[0],
    age: row[2],
    mainConcern: row[3],
    curl: row[5],
    parting: row[6],
    damage: row[11],
    design: row[16],
  });

  // 4) API 호출
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetsId,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    const updates = response.data.updates;
    console.log(
      `${tag} ✅ Google Sheets 저장 성공! ` +
      `업데이트된 셀: ${updates?.updatedCells ?? "?"}개, ` +
      `범위: ${updates?.updatedRange ?? "?"}`,
    );
  } catch (apiErr: unknown) {
    // Google API 에러 상세 파싱
    const gErr = apiErr as {
      code?: number;
      message?: string;
      errors?: { message: string; domain: string; reason: string }[];
    };

    if (gErr.code === 403) {
      console.error(
        `${tag} ❌ 권한 오류(403) — 서비스 계정(${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL})에게 ` +
        `스프레드시트 '편집자' 권한을 부여했는지 확인하세요.`,
      );
    } else if (gErr.code === 404) {
      console.error(
        `${tag} ❌ 시트 없음(404) — GOOGLE_SHEETS_ID(${sheetsId})가 올바른지, ` +
        `'Sheet1' 시트가 존재하는지 확인하세요.`,
      );
    } else if (gErr.message?.includes("invalid_grant") || gErr.message?.includes("JWT")) {
      console.error(
        `${tag} ❌ 인증 실패(invalid_grant) — GOOGLE_PRIVATE_KEY의 줄바꿈 처리를 확인하세요. ` +
        `.env.local에서 키를 큰따옴표로 감싸고, 줄바꿈을 \\n으로 입력하세요. ` +
        `예: GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nABC...\\n-----END PRIVATE KEY-----\\n"`,
      );
    } else {
      console.error(`${tag} ❌ Google Sheets API 오류:`, gErr.message ?? apiErr);
      if (gErr.errors?.length) {
        gErr.errors.forEach((e) =>
          console.error(`  └─ [${e.domain}/${e.reason}] ${e.message}`),
        );
      }
    }

    throw apiErr;
  }
}

// ── 가르마 정규화 (시트 저장용) ────────────────────────────────────────────
function normalizePartingForSheet(raw: string): string {
  if (raw === "left" || raw === "right") return "side_part";
  return raw;
}
