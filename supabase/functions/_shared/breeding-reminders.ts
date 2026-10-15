/**
 * Daily breeding reminders — pure logic, no database access or outbound send.
 * Run on the server in Asia/Seoul. Keep user data isolated per authenticated owner.
 * Historical milestones are not reminders (only future bottle changes,
 * planned breakdown and custom reminders / events).
 */
export type Reminder = { label: string; type: "breeding" | "reminder"; date: string };
type RecordLike = Record<string, any>;
const iso = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
function addDays(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function safeLabel(v: unknown): string {
  return String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 100);
}
export function collectReminderEvents(data: RecordLike): Reminder[] {
  const out: Reminder[] = [];
  for (const individual of Array.isArray(data?.individuals) ? data.individuals : []) {
    if (individual?.status !== "유충") continue;
    const recs = [...(Array.isArray(individual.bottleRecords) ? individual.bottleRecords : [])]
      .sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));
    const last = recs.at(-1);
    if (iso(last?.nextDate)) out.push({date:last.nextDate, type:"breeding", label:safeLabel(individual.code) + " 균사병 교체"});
  }
  for (const line of Array.isArray(data?.lines) ? data.lines : []) {
    // Actual pair/set/breakdown dates are history entries; only planned breakdown is a reminder.
    if (!iso(line?.breakdownDate) && iso(line?.setDate)) {
      out.push({date:addDays(line.setDate,30),type:"breeding",label:safeLabel(line.code)+" 산란세트 해체"});
    }
  }
  for (const ev of Array.isArray(data?.customEvents) ? data.customEvents : []) {
    if (iso(ev?.remindDate)) out.push({date:ev.remindDate,type:"reminder",label:safeLabel(ev.remindTitle || ev.title)});
    else if (iso(ev?.date)) out.push({date:ev.date,type:"reminder",label:safeLabel(ev.title)});
  }
  return out.filter(x => x.label.trim() !== "");
}
export function remindersDue(data: RecordLike, prefs: RecordLike, todayKst: string): Reminder[] {
  if (!prefs?.push_enabled || !iso(todayKst)) return [];
  const days = [0,1,3].includes(Number(prefs.advance_days)) ? Number(prefs.advance_days) : 1;
  return collectReminderEvents(data).filter(x => {
    if (x.type === "breeding" && !prefs.breeding_enabled) return false;
    if (x.type === "reminder" && !prefs.reminder_enabled) return false;
    return x.date === addDays(todayKst, x.type === "breeding" ? days : 0);
  });
}
export function dailyNotificationBody(due: Reminder[]): string {
  if (due.length === 0) return "";
  if (due.length > 3) return "알림 대상 할 일 " + due.length + "건을 해야 합니다.";
  return due.map(x => x.label + " 해야 합니다.").join("\n");
}
