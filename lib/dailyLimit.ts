// ============================================================================
// lib/dailyLimit.ts — 하루 3회 AI 진단 제한
// localStorage: { date: "YYYY-MM-DD", count: number }
// 자정이 지나면 date가 달라지므로 count 자동 초기화 (별도 타이머 불필요)
// ============================================================================

const STORAGE_KEY = "abeauty:dailyLimit";
export const DAILY_MAX = 3;

interface DailyData {
  date:  string; // "YYYY-MM-DD" 로컬 시간 기준
  count: number;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function load(): DailyData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as DailyData;
      if (data.date === todayStr()) return data;
    }
  } catch { /**/ }
  return { date: todayStr(), count: 0 };
}

/** 오늘 남은 진단 횟수 (0 ~ DAILY_MAX) */
export function getRemainingUses(): number {
  return Math.max(0, DAILY_MAX - load().count);
}

/** 오늘 진단 가능 여부 */
export function canUseToday(): boolean {
  return getRemainingUses() > 0;
}

/** API 호출 직전에 호출 — 사용 횟수 1 증가 */
export function incrementUsage(): void {
  try {
    const data = load();
    data.count = Math.min(DAILY_MAX, data.count + 1);
    data.date  = todayStr();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /**/ }
}
