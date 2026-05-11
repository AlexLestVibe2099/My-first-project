import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const DEFAULT_ADVICE =
  "Записывай самочувствие каждый день, чтобы рекомендации становились точнее. Если состояние заметно ухудшается, лучше обсудить это со специалистом.";

export function useAiAdvice(user, today) {
  const [advice, setAdvice] = useState(DEFAULT_ADVICE);
  const [source, setSource] = useState("fallback");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function fetchAdvice() {
      if (!user?.id) {
        setAdvice(DEFAULT_ADVICE);
        setSource("fallback");
        setLoading(false);
        return;
      }

      const payload = {
        note: today?.note || "",
        symptom: today?.symptom || "",
        mood: today?.quickStats?.mood || "",
        pain: today?.quickStats?.pain || "",
        energy: today?.quickStats?.energy || "",
        cycleDay: today?.cycleDay || "",
        phase: today?.phase || "",
      };

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("ai-daily-advice", {
          body: payload,
        });

        if (error) throw error;

        if (!isCancelled) {
          setAdvice(typeof data?.advice === "string" && data.advice.trim() ? data.advice.trim() : DEFAULT_ADVICE);
          setSource(data?.source === "openai" ? "openai" : "fallback");
        }
      } catch {
        if (!isCancelled) {
          setAdvice(DEFAULT_ADVICE);
          setSource("fallback");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchAdvice();
    return () => {
      isCancelled = true;
    };
  }, [
    user?.id,
    today?.note,
    today?.symptom,
    today?.cycleDay,
    today?.phase,
    today?.quickStats?.mood,
    today?.quickStats?.pain,
    today?.quickStats?.energy,
  ]);

  return { advice, source, loading };
}
