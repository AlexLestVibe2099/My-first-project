type AdviceRequest = {
  note?: string;
  symptom?: string;
  mood?: string;
  pain?: string | number;
  energy?: string;
  cycleDay?: string | number;
  phase?: string;
};

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function getAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS")?.trim();
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const ALLOWED_ORIGINS = getAllowedOrigins();

function resolveAllowedOrigin(req: Request): string | null {
  const origin = req.headers.get("origin")?.trim();
  if (!origin) return null;
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

function buildCorsHeaders(req: Request): Record<string, string> {
  const allowedOrigin = resolveAllowedOrigin(req);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }
  return headers;
}

function jsonResponse(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function normalizeText(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function toNumberOrNull(value: string | number | undefined): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash);
}

function pickTemplate(templates: string[], seed: string): string {
  if (!templates.length) return "";
  const index = hashString(seed) % templates.length;
  return templates[index];
}

const TEMPLATES_HIGH_PAIN = [
  "При выраженной боли сначала попробуй тепло на низ живота — грелку или теплую ванну. Если боль держится, можно обсудить с врачом безопасный прием НПВС по инструкции к препарату.",
  "Сегодня лучше снизить физическую и рабочую нагрузку, а для симптомов использовать локальное тепло. Если боль остается сильной несколько циклов подряд, стоит запланировать очную консультацию.",
  "При интенсивных спазмах обычно помогает сочетание отдыха и тепла на область живота. Если обезболивание по инструкции не помогает, лучше не откладывать обращение к специалисту.",
  "Сейчас приоритет — мягкий режим дня и быстрые методы самопомощи: тепло и отдых. Если боль нарастает или мешает обычной активности, обратись за медицинской оценкой.",
  "Для сильных менструальных болей чаще всего рекомендуют тепло и своевременный прием противовоспалительных средств по инструкции. Если симптомы очень выраженные или необычные для тебя, лучше связаться с врачом.",
];

const TEMPLATES_MODERATE_PAIN = [
  "При умеренной боли часто помогает легкая активность, например спокойная ходьба, и тепло на низ живота. Попробуй короткую прогулку и затем 15-20 минут тепла.",
  "Если тянет живот, попробуй бережный ритм дня: меньше резких нагрузок, больше коротких пауз. Теплая ванна или грелка обычно помогают снизить дискомфорт.",
  "Для умеренных спазмов полезно сочетать отдых и мягкое движение, чтобы не усиливать зажатость мышц. Наблюдай динамику симптомов в течение дня и отмечай, что помогает лучше всего.",
  "Сегодня можно сделать упор на комфорт: тепло, спокойный темп и регулярные перерывы. Если боль станет сильнее, переходи к более щадящему режиму и обсуди тактику с врачом.",
  "Умеренный дискомфорт часто лучше переносится, когда добавить мягкую физическую активность и избегать перегрузки. Запиши в заметку, какие шаги дали лучший эффект, чтобы использовать их в следующий цикл.",
];

const TEMPLATES_LOW_ENERGY = [
  "При низкой энергии постарайся перераспределить день: сначала обязательные задачи, остальное — по остаточному ресурсу. Полезно держать режим сна ближе к 7-8 часам.",
  "Если сил мало, лучше перейти на более спокойный темп и добавить короткие восстановительные паузы. Сегодня важнее стабильный ритм и базовый отдых, чем высокая продуктивность.",
  "На фоне усталости обычно помогает простой план: меньше многозадачности, больше предсказуемого графика и вечернее замедление. Попробуй убрать лишние стимуляторы ближе к сну.",
  "Низкая энергия — хороший сигнал снизить нагрузку и поддержать базовые привычки: сон, еда по расписанию и небольшая дневная активность. Так состояние обычно выравнивается мягче.",
  "Сегодня лучше держать фокус на восстановлении: умеренная активность, спокойный вечер и ранний отход ко сну. Если выраженная усталость повторяется часто, фиксируй это в журнале для последующей консультации.",
];

const TEMPLATES_STRESS_MOOD = [
  "При тревожности в ПМС-периоде обычно помогает снизить плотность расписания и добавить короткие техники расслабления. Попробуй 5-10 минут спокойного дыхания или растяжки.",
  "Если настроение нестабильно, сделай день чуть более щадящим: меньше раздражающих триггеров и больше управляемых пауз. Мягкая физическая активность часто снижает стрессовый фон.",
  "Когда растет раздражительность, полезно заранее запланировать короткие перерывы и уменьшить перегрузку информацией. Спокойная прогулка или легкая йога могут дать заметное облегчение.",
  "Сегодня можно поддержать эмоциональный фон простым режимом: умеренная активность, меньше кофеина и предсказуемый график. Такой набор часто уменьшает перепады самочувствия.",
  "Для напряженного дня лучше выбрать бережный темп и регулярно переключаться на короткие восстановительные паузы. Если тревога держится долго, обсуди состояние со специалистом по ментальному здоровью.",
];

const TEMPLATES_BLOATING_FOOD = [
  "Если есть вздутие, попробуй более частые, но небольшие приемы пищи в течение дня. Также обычно помогает снизить избыток соли в рационе.",
  "При отечности и вздутии часто советуют уменьшить соленое и очень обработанные продукты. Небольшие регулярные приемы пищи обычно переносятся комфортнее.",
  "Сегодня при дискомфорте в животе лучше перейти на простой и предсказуемый рацион небольшими порциями. Снижение соли нередко уменьшает задержку жидкости.",
  "Если чувствуешь вздутие, полезно убрать лишне соленые перекусы и сохранить ровный режим питания. Отмечай в заметке, какие продукты в этот период переносятся легче.",
  "Для контроля вздутия попробуй есть чаще и меньшими порциями, а не делать длинные паузы между приемами пищи. Умеренное ограничение соли часто помогает снизить тяжесть симптомов.",
];

const TEMPLATES_CAFFEINE_ALCOHOL = [
  "На фоне ПМС стоит ограничить избыток кофеина и алкоголя — это часто уменьшает раздражительность и нарушения сна. Сделай акцент на более спокойный вечерний режим.",
  "Если заметны перепады настроения или сон стал хуже, попробуй на несколько дней сократить кофеин и алкоголь. Такой шаг часто улучшает переносимость симптомов.",
  "Сегодня полезно уменьшить стимулирующие напитки, особенно во второй половине дня. Это может поддержать сон и снизить ощущение внутреннего напряжения.",
  "При выраженной утомляемости и раздражительности лучше не компенсировать состояние лишним кофеином. Более устойчивый эффект обычно дает режим сна и умеренная активность.",
  "Попробуй мягкий эксперимент на этот цикл: меньше кофеина и без алкоголя в дни с симптомами. Сравни самочувствие по заметкам, чтобы понять личную реакцию.",
];

const TEMPLATES_SLEEP = [
  "Сегодня полезно сделать ставку на сон: постарайся выйти на 7-8 часов и спокойный ритуал перед сном. Это часто помогает снизить усталость и эмоциональные перепады.",
  "Если сон сбился, попробуй вечер без перегрузки и короткое расслабление перед отходом ко сну. Стабильный режим сна обычно улучшает переносимость симптомов цикла.",
  "При дневной разбитости лучше заранее запланировать более ранний сон и мягкое завершение дня. Регулярный отдых часто уменьшает выраженность ПМС-симптомов.",
  "Сегодня стоит защитить вечернее время от лишних задач, чтобы сон был глубже и длиннее. Даже несколько ночей с ровным режимом заметно поддерживают самочувствие.",
  "Когда энергии мало, лучший краткосрочный фокус — качественный сон и спокойный вечерний ритм. Отмечай, как меняются симптомы после 2-3 дней стабильного сна.",
];

const TEMPLATES_ACTIVITY = [
  "Даже при неидеальном самочувствии полезна умеренная активность: быстрая ходьба, плавание или легкая велонагрузка. Регулярные аэробные нагрузки часто уменьшают утомляемость и ухудшение настроения.",
  "Сегодня подойдёт мягкое движение без перегруза: прогулка, растяжка или легкая йога. Регулярная активность обычно помогает легче переносить симптомы цикла.",
  "При эмоциональной и физической усталости попробуй короткую прогулку в удобном темпе. Даже 20-30 минут умеренного движения часто улучшают общее самочувствие.",
  "Стабильная аэробная активность в течение недели обычно работает лучше разовых интенсивных тренировок. Сегодня выбери комфортный формат, который не усиливает дискомфорт.",
  "Если есть симптомы ПМС, не обязательно полностью отменять движение — лучше перейти на щадящий формат. Небольшая, но регулярная активность часто снижает выраженность симптомов.",
];

const TEMPLATES_GENERAL = [
  "Сейчас лучше держать бережный режим: умеренная активность, регулярный сон и понятный план дня. Продолжай ежедневные записи, чтобы видеть личные закономерности цикла.",
  "Текущее состояние похоже на фазу, где особенно важны стабильные привычки и предсказуемый ритм. Поддерживай баланс нагрузки и отдыха, а изменения фиксируй в заметках.",
  "Сегодня полезно сосредоточиться на базовой самоподдержке: сон, спокойный темп и короткие паузы в течение дня. Такие шаги обычно улучшают переносимость симптомов.",
  "Если симптомы умеренные, лучший подход — мягкий режим и наблюдение динамики до конца дня. В журнале отмечай, что конкретно помогло, чтобы повторить это в следующий цикл.",
  "По текущим данным стоит сохранить щадящий и стабильный ритм без резких перегрузок. При заметном ухудшении самочувствия лучше обратиться за индивидуальной консультацией.",
];

const TEMPLATES_HEADACHE = [
  "При головной боли в дни цикла полезно снизить нагрузку, сделать короткий отдых и пить достаточно жидкости в течение дня. Если боль выраженная или необычная для тебя, лучше обсудить это со специалистом.",
  "Сегодня при головной боли лучше сократить переутомление и выделить время на восстановление. Наблюдай, что помогает быстрее — отдых в тишине, мягкая активность или короткие паузы.",
];

const TEMPLATES_NAUSEA = [
  "При тошноте обычно легче переносятся небольшие и более частые приемы пищи, без длинных пауз. Если симптом усиливается или держится долго, лучше обратиться за медицинской консультацией.",
  "Сегодня при тошноте стоит выбрать щадящий режим питания маленькими порциями и избегать перегрузки. Отмечай в заметке, какие продукты и ритм дня переносятся комфортнее.",
];

const TEMPLATES_ACNE = [
  "При высыпаниях полезно сохранять стабильный режим сна и снижать стрессовую нагрузку, чтобы не усиливать кожную реактивность. Наблюдай, как симптомы меняются от цикла к циклу.",
  "Сегодня лучше сделать акцент на бережный режим и регулярный сон, это часто помогает при кожных проявлениях в предменструальные дни. Если изменения кожи стойкие, стоит обсудить это с дерматологом.",
];

function templatesBySymptom(symptom: string): string[] | null {
  switch (symptom) {
    case "headache":
      return TEMPLATES_HEADACHE;
    case "lower_abdominal_pain":
    case "cramps":
    case "back_pain":
    case "breast_tenderness":
      return [...TEMPLATES_HIGH_PAIN, ...TEMPLATES_MODERATE_PAIN];
    case "bloating":
      return TEMPLATES_BLOATING_FOOD;
    case "nausea":
      return TEMPLATES_NAUSEA;
    case "fatigue":
      return [...TEMPLATES_LOW_ENERGY, ...TEMPLATES_SLEEP];
    case "irritability":
      return TEMPLATES_STRESS_MOOD;
    case "acne":
      return TEMPLATES_ACNE;
    default:
      return null;
  }
}

function fallbackAdvice(payload: AdviceRequest): string {
  const mood = normalizeText(payload.mood, 120).toLowerCase();
  const energy = normalizeText(payload.energy, 120).toLowerCase();
  const note = normalizeText(payload.note, 500).toLowerCase();
  const symptom = normalizeText(payload.symptom, 80).toLowerCase();
  const pain = toNumberOrNull(payload.pain);
  const seed = `${new Date().toISOString().slice(0, 10)}|${note}|${symptom}|${mood}|${energy}|${String(payload.pain ?? "")}|${String(payload.phase ?? "")}`;

  const symptomTemplates = templatesBySymptom(symptom);
  if (symptomTemplates?.length) {
    return pickTemplate(symptomTemplates, `symptom:${symptom}|${seed}`);
  }

  if (pain !== null && pain >= 7) {
    return pickTemplate(TEMPLATES_HIGH_PAIN, `highPain|${seed}`);
  }

  if (pain !== null && pain >= 4) {
    return pickTemplate(TEMPLATES_MODERATE_PAIN, `moderatePain|${seed}`);
  }

  if (note.includes("вздут") || note.includes("отек") || note.includes("отёк")) {
    return pickTemplate(TEMPLATES_BLOATING_FOOD, `bloating|${seed}`);
  }

  if (
    note.includes("кофе") ||
    note.includes("кофеин") ||
    note.includes("алкогол") ||
    mood.includes("раздраж")
  ) {
    return pickTemplate(TEMPLATES_CAFFEINE_ALCOHOL, `stimulants|${seed}`);
  }

  if (
    note.includes("сон") ||
    note.includes("бессон") ||
    note.includes("не высп") ||
    energy.includes("устал") ||
    energy.includes("низ")
  ) {
    return pickTemplate(TEMPLATES_SLEEP, `sleep|${seed}`);
  }

  if (
    mood.includes("трев") ||
    mood.includes("стресс") ||
    mood.includes("раздраж") ||
    note.includes("трев") ||
    note.includes("стресс")
  ) {
    return pickTemplate(TEMPLATES_STRESS_MOOD, `stressMood|${seed}`);
  }

  if (
    note.includes("устал") ||
    note.includes("нет сил") ||
    energy.includes("низ") ||
    energy.includes("устал")
  ) {
    return pickTemplate(TEMPLATES_LOW_ENERGY, `lowEnergy|${seed}`);
  }

  if (
    note.includes("прогул") ||
    note.includes("трен") ||
    note.includes("йог") ||
    note.includes("актив")
  ) {
    return pickTemplate(TEMPLATES_ACTIVITY, `activity|${seed}`);
  }

  const combined = [
    ...TEMPLATES_GENERAL,
    ...TEMPLATES_ACTIVITY,
    ...TEMPLATES_LOW_ENERGY,
    ...TEMPLATES_STRESS_MOOD,
    ...TEMPLATES_SLEEP,
    ...TEMPLATES_BLOATING_FOOD,
    ...TEMPLATES_CAFFEINE_ALCOHOL,
  ];

  return pickTemplate(combined, `general|${seed}`);
}

async function generateOpenAIAdvice(payload: AdviceRequest): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
  const systemPrompt =
    "Ты помощник в приложении отслеживания цикла. Дай короткую мягкую рекомендацию на русском языке строго в 2-3 предложениях. Не ставь диагнозы, не назначай лекарства, не используй пугающий тон. Делай практичные, бережные советы по режиму дня и самонаблюдению.";

  const input = {
    note: normalizeText(payload.note, 700),
    symptom: normalizeText(payload.symptom, 80),
    mood: normalizeText(payload.mood, 80),
    pain: payload.pain ?? "",
    energy: normalizeText(payload.energy, 80),
    cycleDay: payload.cycleDay ?? "",
    phase: normalizeText(payload.phase, 80),
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_output_tokens: 120,
      input: [
        { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
        { role: "user", content: [{ type: "input_text", text: JSON.stringify(input) }] },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const data = await response.json();
  const outputText = typeof data?.output_text === "string" ? data.output_text.trim() : "";
  if (!outputText) {
    throw new Error("OpenAI returned empty output");
  }
  return outputText;
}

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const requestOrigin = req.headers.get("origin")?.trim() || "";
  const allowedOrigin = resolveAllowedOrigin(req);

  if (requestOrigin && !allowedOrigin) {
    return jsonResponse(req, 403, { error: "Origin is not allowed" });
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: buildCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  let payload: AdviceRequest;
  try {
    payload = (await req.json()) as AdviceRequest;
  } catch {
    return jsonResponse(req, 400, { error: "Invalid JSON payload" });
  }

  try {
    const advice = await generateOpenAIAdvice(payload);
    console.log(
      JSON.stringify({
        action: "ai_daily_advice",
        endpoint: "/functions/v1/ai-daily-advice",
        status: 200,
        duration_ms: Date.now() - startedAt,
        source: "openai",
      }),
    );
    return jsonResponse(req, 200, { advice, source: "openai" });
  } catch {
    const advice = fallbackAdvice(payload);
    console.log(
      JSON.stringify({
        action: "ai_daily_advice",
        endpoint: "/functions/v1/ai-daily-advice",
        status: 200,
        duration_ms: Date.now() - startedAt,
        source: "fallback",
      }),
    );
    return jsonResponse(req, 200, { advice, source: "fallback" });
  }
});
