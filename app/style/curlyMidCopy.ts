// ============================================================================
// app/style/curlyMidCopy.ts — 곱슬(중간) 9타입 카피 공용 출처 (카피 최종본 §2·§3)
//
// hairTypeCopy.ts(핵심카피 9키)와 hairTypeMatrix.ts(곱슬중간 36엔트리 타입 서술)가
// 함께 참조한다. 순환참조를 피하려고 별도 모듈로 둔다(여기서 다른 style 모듈 import 없음).
//   textureSummary = whyItHappens, styleDirection = stylePrescription (문서 §3 파생 규칙).
// 키 = `${thickness}__${density}`.
// ============================================================================

export interface CurlyMidEntry {
  title:             string; // hairTypeTitle (명사구 축약)
  painPointHeadline: string;
  whyItHappens:      string;
  stylePrescription: string;
  discoveryItemHint: string;
}

export const CURLY_MID_COPY: Record<string, CurlyMidEntry> = {
  // C1
  "coarse__thick_density": {
    title: "부피가 큰 곱슬 모발",
    painPointHeadline: "매일 아침 펴는 데만 시간을 다 쓰게 되는 머리예요",
    whyItHappens: "곱슬기에 굵기와 숱이 모두 있으면 부피가 세 배로 붙습니다. 펴놓지 않으면 부해 보이고, 펴는 데는 시간이 오래 걸리는 게 당연한 조합이에요.",
    stylePrescription: "매일 전체를 펴는 대신 안쪽 양감을 정리해 부피를 줄여두면, 아침에 쓰는 시간이 확 줄어듭니다.",
    discoveryItemHint: "결을 정돈해주는 크림",
  },
  // C2
  "coarse__medium_density": {
    title: "결이 뻗치는 굵은 곱슬",
    painPointHeadline: "펴놓지 않으면 결이 제멋대로 뻗는 머리예요",
    whyItHappens: "굵은 모발은 곱슬기가 있으면 방향이 제각각으로 섭니다. 숱이 과하진 않아 부피는 덜하지만, 결이 정돈되지 않으면 지저분해 보이기 쉬워요.",
    stylePrescription: "부피를 줄이기보다 결의 방향을 한쪽으로 모아주는 정돈이 이 머리엔 더 잘 맞습니다.",
    discoveryItemHint: "결을 정돈해주는 크림",
  },
  // C3
  "coarse__thin_density": {
    title: "곱슬기로 부피만 있는 모발",
    painPointHeadline: "곱슬기 때문에 있어 보이는데, 정작 만져보면 허전한 머리예요",
    whyItHappens: "곱슬이 부피를 만들어줘서 겉으로는 숱이 있어 보이지만 실제 양은 적은, 겉과 속이 다른 조합입니다.",
    stylePrescription: "곱슬을 완전히 눌러 없애면 머리가 확 없어 보일 수 있어요. 곱슬을 볼륨으로 쓰는 방향이 이 머리엔 유리합니다.",
    discoveryItemHint: "볼륨을 살리는 컬 크림",
  },
  // C4
  "medium_thickness__thick_density": {
    title: "습기에 부푸는 곱슬 모발",
    painPointHeadline: "습한 날이면 전체가 부풀어 오르는 머리예요",
    whyItHappens: "곱슬기에 숱이 더해지면 습기를 먹는 면적 자체가 넓어집니다. 같은 날씨에도 남들보다 부피 변화가 크게 느껴지는 이유예요.",
    stylePrescription: "겉결은 건드리지 않고 안쪽 양감만 정리해두면, 습한 날 부풀어 오르는 정도가 눈에 띄게 줄어듭니다.",
    discoveryItemHint: "결을 정돈해주는 크림",
  },
  // C5
  "medium_thickness__medium_density": {
    title: "관리하기 무난한 곱슬 모발",
    painPointHeadline: "손질하기에 따라 인상이 완전히 갈리는 머리예요",
    whyItHappens: "굵기와 숱이 무난해서 관리 부담은 적지만, 곱슬기를 어떻게 다루느냐에 따라 세련되게도 부스스하게도 보이는 타입입니다.",
    stylePrescription: "크게 손볼 게 없는 대신 말리는 방식 하나로 결과가 달라져요. 여기에 신경 쓰는 게 제일 효율이 좋습니다.",
    discoveryItemHint: "기본 컬 정돈 크림",
  },
  // C6
  "medium_thickness__thin_density": {
    title: "컬 사이가 성근 곱슬 모발",
    painPointHeadline: "곱슬기는 있는데 컬 사이가 비어 보이는 머리예요",
    whyItHappens: "곱슬은 가닥이 촘촘해야 모양이 사는데, 숱이 적으면 컬과 컬 사이가 벌어져 성글게 보입니다.",
    stylePrescription: "곱슬을 눌러 없애기보다 컬 크기를 키워 뭉치게 만드는 쪽이 훨씬 풍성해 보여요.",
    discoveryItemHint: "볼륨을 살리는 컬 무스",
  },
  // C7
  "fine__thick_density": {
    title: "힘없이 퍼지는 곱슬 모발",
    painPointHeadline: "숱은 많은데 곱슬이 힘없이 퍼지는 머리예요",
    whyItHappens: "숱은 충분해도 한 올이 가늘면 곱슬을 지탱하지 못합니다. 컬이 서지 못하고 옆으로 퍼지면서 부피만 커 보이는 상태가 되기 쉬워요.",
    stylePrescription: "전체를 강하게 누르면 볼륨까지 죽습니다. 볼륨은 남기고 부피만 줄이는 부분 정돈이 이 머리의 답이에요.",
    discoveryItemHint: "가벼운 컬 정돈 에센스",
  },
  // C8
  "fine__medium_density": {
    title: "결이 금방 흐트러지는 곱슬",
    painPointHeadline: "아침에 잡아놓은 결이 오후면 흐트러지는 머리예요",
    whyItHappens: "모발이 가늘면 곱슬을 잡아둘 힘이 약해서, 정돈해놓아도 시간이 지나면 원래 결로 돌아갑니다.",
    stylePrescription: "무거운 제품으로 누르면 더 처져요. 가벼운 제품으로 자주 잡아주는 쪽이 이 머리엔 잘 맞습니다.",
    discoveryItemHint: "가벼운 컬 크림",
  },
  // C9
  "fine__thin_density": {
    title: "볼륨이 쉽게 꺼지는 곱슬 모발",
    painPointHeadline: "곱슬기는 있는데 힘도 양도 부족해 금방 가라앉는 머리예요",
    whyItHappens: "가는 모발에 숱까지 적으면 곱슬을 지탱할 힘 자체가 없습니다. 컬은 있는데 볼륨은 사라진 것처럼 보이는 이유예요.",
    stylePrescription: "곱슬을 누르는 건 이 머리엔 손해입니다. 볼륨을 최우선으로 살리는 부분 정돈 방향이 맞아요.",
    discoveryItemHint: "볼륨과 컬을 함께 잡는 가벼운 케어 제품",
  },
};
