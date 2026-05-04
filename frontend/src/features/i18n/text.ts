import type { Language } from "../../api/types";

export const text = {
  en: {
    appDesc: "Dashboard and skill runtime for AI workflows.",
    dashboard: "Dashboard",
    runSkill: "Run Skill",
    config: "Config",
    loading: "Loading",
    ready: "Ready",
    error: "Error",
    refresh: "Refresh",
    save: "Save Config",
    clear: "Clear",
    testLlm: "Test LLM Fallbacks",
    testProviders: "Test Media Provider APIs",
    rotateKey: "Rotate Key",
    run: "Run Skill",
    reset: "Reset",
    sample: "Thai Cats Sample",
    copy: "Copy",
    download: "Download JSON",
    prompt: "Prompt",
    json: "JSON",
    review: "Review"
  },
  th: {
    appDesc: "แดชบอร์ดและระบบรันสกิลสำหรับงาน AI",
    dashboard: "แดชบอร์ด",
    runSkill: "รันสกิล",
    config: "ตั้งค่า",
    loading: "กำลังโหลด",
    ready: "พร้อม",
    error: "ผิดพลาด",
    refresh: "รีเฟรช",
    save: "บันทึกการตั้งค่า",
    clear: "ล้าง",
    testLlm: "ทดสอบ LLM",
    testProviders: "ทดสอบ Provider APIs",
    rotateKey: "หมุนคีย์เข้ารหัส",
    run: "รันสกิล",
    reset: "รีเซ็ต",
    sample: "ตัวอย่างแมวไทย",
    copy: "คัดลอก",
    download: "ดาวน์โหลด JSON",
    prompt: "พรอมต์",
    json: "JSON",
    review: "รีวิว"
  }
};

export function t(language: Language, key: keyof typeof text.en) {
  return text[language][key] || text.en[key];
}
