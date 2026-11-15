/* Unit tests for sound-settings logic (pure, no browser) — adapted IEC 60601-1-8. */
import { expect, test } from "@playwright/test";
import { DEFAULT_SETTINGS, LOCKED, MIN_HIGH_VOLUME, SNOOZE_MS, effectiveVolume, loadSettings, normalize, saveSettings, setCategory, shouldPlay, snoozeUntil } from "../src/features/sound/settings";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

test.describe("sound settings (logic)", () => {
  test("defaults: only the red / extreme alert", () => {
    const s = normalize(undefined);
    expect(s.muted).toBe(false);
    expect(s.categories.alarmHigh).toBe(true);
    expect(s.categories.alarmMedium).toBe(false);
    expect(s.categories.badge).toBe(false);
    expect(s.categories.sensor).toBe(false);
    expect(s.categories.report).toBe(false);
    expect(s.categories.landing).toBe(false);
    expect(s.categories.login).toBe(false);
    expect(s.categories.watchTick).toBe(false);
  });
  test("normalize: volume clamped, unknown categories ignored, red forced on, the rest forced silent", () => {
    const s = normalize({ volume: 7, muted: true, categories: { alarmHigh: false, badge: true, alarmMedium: true, foo: true } });
    expect(s.volume).toBe(1);
    expect(s.muted).toBe(true);
    expect(s.categories.alarmHigh).toBe(true);
    expect(s.categories.badge).toBe(false);
    expect(s.categories.alarmMedium).toBe(false);
    expect(normalize({ volume: -3 }).volume).toBe(0);
    expect(normalize("not-an-object")).toEqual(DEFAULT_SETTINGS);
  });
  test("persistence: save then read back", () => {
    const st = mem();
    saveSettings(st, { ...DEFAULT_SETTINGS, muted: true, volume: 0.25 });
    expect(loadSettings(st).muted).toBe(true);
    expect(loadSettings(st).volume).toBe(0.25);
    st.setItem("pulsar.sound", "{broken");
    expect(loadSettings(st)).toEqual(DEFAULT_SETTINGS);
  });
  test("the red alarm cannot be turned off", () => {
    expect(LOCKED).toContain("alarmHigh");
    const s = setCategory(DEFAULT_SETTINGS, "alarmHigh", false);
    expect(s.categories.alarmHigh).toBe(true);
    expect(setCategory(DEFAULT_SETTINGS, "report", true).categories.report).toBe(true);
  });
  test("mute: cuts everything except red, whose volume stays ≥ 40%", () => {
    const s = { ...DEFAULT_SETTINGS, muted: true, volume: 0 };
    expect(shouldPlay(s, "alarmMedium")).toBe(false);
    expect(shouldPlay(s, "login")).toBe(false);
    expect(shouldPlay(s, "alarmHigh", { acknowledged: false })).toBe(true);
    expect(effectiveVolume(s, "alarmHigh")).toBe(MIN_HIGH_VOLUME);
    expect(effectiveVolume(s, "alarmMedium")).toBe(0);
  });
  test("red: silent only when acknowledged or paused for 2 min", () => {
    const now = 1_000_000;
    expect(shouldPlay(DEFAULT_SETTINGS, "alarmHigh", { acknowledged: true }, now)).toBe(false);
    const until = snoozeUntil(now);
    expect(until - now).toBe(SNOOZE_MS);
    expect(shouldPlay(DEFAULT_SETTINGS, "alarmHigh", { acknowledged: false, snoozedUntil: until }, now + 60_000)).toBe(false);
    expect(shouldPlay(DEFAULT_SETTINGS, "alarmHigh", { acknowledged: false, snoozedUntil: until }, now + SNOOZE_MS + 1)).toBe(true);
  });
  test("outside red: no sound", () => {
    expect(shouldPlay(DEFAULT_SETTINGS, "badge")).toBe(false);
    expect(shouldPlay(DEFAULT_SETTINGS, "report")).toBe(false);
    expect(shouldPlay(DEFAULT_SETTINGS, "alarmMedium")).toBe(false);
    expect(shouldPlay(DEFAULT_SETTINGS, "watchTick")).toBe(false);
    expect(shouldPlay(DEFAULT_SETTINGS, "login")).toBe(false);
  });
});
