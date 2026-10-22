// Registration-call slots: 30 minutes, 10:00-18:00 India time, next 3 days.
// Pure function, so both the server (to validate a booking) and the board
// (to draw the calendar) get exactly the same list.
const IST_OFFSET = 330 * 60_000;
const DAY = 86_400_000;
const DAYS_AHEAD = 3;
const FIRST_MIN = 10 * 60;
const LAST_MIN = 18 * 60;
const STEP = 30;
const LEAD_TIME = 30 * 60_000; // can't book a slot starting in under 30 minutes

export function upcomingSlots(now = Date.now()): string[] {
  const todayIst = Math.floor((now + IST_OFFSET) / DAY) * DAY;
  const slots: string[] = [];
  for (let d = 0; d < DAYS_AHEAD; d++) {
    for (let m = FIRST_MIN; m < LAST_MIN; m += STEP) {
      const start = todayIst + d * DAY + m * 60_000 - IST_OFFSET;
      if (start > now + LEAD_TIME) slots.push(new Date(start).toISOString());
    }
  }
  return slots;
}

export function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function slotLabel(iso: string) {
  return `${dayLabel(iso)}, ${timeLabel(iso)}`;
}
