/* Program content: 12-week home workout plan. Pure data, no DOM. */

/** Day 1 of week 1 (a Monday). Month is 0-based. */
export const START = new Date(2026, 10, 23);
export const WEEKS = 12;

/** Exercise: name, sets, reps text, rest seconds, + options (dur = timed hold, ss = superset tag, tip, emom minutes). */
const E = (n, s, r, sec, o = {}) => Object.assign({ n, s, r, sec, dur: 0, ss: null, tip: "" }, o);

export const S = {
  push: { name: "Push", full: "Push Day", c: "var(--push)", g: "linear-gradient(150deg,#FF6B5E 0%,#EE3456 52%,#C81D55 100%)", deep: "#C81D46", ic: "dumbbell", dur: "55–60 phút", ex: [
    E("Parallel Bar Dip", 5, "6–12 reps · last set AMRAP", 120, { tip: "Quá 12 reps thì làm weighted dip: kẹp kettlebell 8 kg giữa chân" }),
    E("Single-Arm Kettlebell Overhead Press (12 kg)", 4, "6–10 reps mỗi tay", 0, { ss: "SS1", tip: "Nặng quá thì dùng kettlebell 8 kg" }),
    E("Feet-Elevated Push-Up", 4, "10–20 reps", 90, { ss: "SS1" }),
    E("Single-Arm High-to-Low Cable Fly", 3, "12–15 reps mỗi tay", 60, { tip: "Đứng nghiêng cạnh xà. Last set: drop set" }),
    E("Dumbbell Lateral Raise (5 kg)", 4, "15–20 reps", 0, { ss: "SS2", tip: "Tempo: eccentric 3 giây" }),
    E("Rope Triceps Pushdown", 4, "12–15 reps", 60, { ss: "SS2", tip: "Last set: drop set" })] },
  pull: { name: "Pull", full: "Pull Day + Core", c: "var(--pull)", g: "linear-gradient(150deg,#5B9DFF 0%,#3165EE 52%,#2443C4 100%)", deep: "#2450D0", ic: "dumbbell", dur: "55–60 phút", ex: [
    E("Pull-Up", 5, "5–10 reps · last set AMRAP", 120, { tip: "Chưa được 5 reps: làm negative pull-up (hạ chậm 5s). Quá 10: weighted pull-up với kettlebell 8 kg" }),
    E("Half-Kneeling Single-Arm Lat Pulldown", 4, "10–12 reps mỗi tay", 0, { ss: "SS1", tip: "Kéo khuỷu tay về hông, pause 1s" }),
    E("Hanging Knee Raise", 4, "10–15 reps", 90, { ss: "SS1", tip: "Dễ quá thì chuyển sang Hanging Leg Raise" }),
    E("Single-Arm Kettlebell Row (12 kg)", 3, "12–15 reps mỗi tay", 60, { tip: "Pause 1s ở đỉnh" }),
    E("Rope Face Pull", 3, "15–20 reps", 0, { ss: "SS2" }),
    E("Dumbbell Biceps Curl (5 kg)", 4, "12–15 reps", 60, { ss: "SS2", tip: "Last set: rest-pause (rest 15s, làm tiếp, ×2)" })] },
  legs: { name: "Legs", full: "Leg Day", c: "var(--legs)", g: "linear-gradient(150deg,#1FBF75 0%,#0E9C5E 52%,#07774A 100%)", deep: "#0A8050", ic: "legs", dur: "50–55 phút", ex: [
    E("Kettlebell Goblet Squat (12 kg)", 4, "15–20 reps", 90, { tip: "Tempo 3-1-1: eccentric 3s, pause 1s ở đáy" }),
    E("Dumbbell Bulgarian Split Squat (2 × 5 kg)", 4, "10–15 reps mỗi chân", 90, { tip: "Chân sau gác lên ghế" }),
    E("Single-Leg Kettlebell RDL (12 kg)", 3, "10–12 reps mỗi chân", 60, { tip: "Lưng thẳng, hip hinge: đẩy hông ra sau" }),
    E("Kettlebell Swing (12 kg)", 5, "20 reps", 45, { tip: "Lực từ hip hinge, không kéo bằng tay" }),
    E("Single-Leg Calf Raise", 4, "15–20 reps mỗi chân", 45, { tip: "Cầm kettlebell, pause 2s ở đỉnh" }),
    E("Side Plank", 3, "45s mỗi bên", 30, { dur: 45, tip: "Đếm 45s bên trái rồi bấm lại cho bên phải" })] },
  upper: { name: "Upper", full: "Upper Body Accessory", c: "var(--upper)", g: "linear-gradient(150deg,#FF8A3D 0%,#EE6416 52%,#C9480B 100%)", deep: "#C2500E", ic: "dumbbell", dur: "40–45 phút", ex: [
    E("EMOM: Pull-Up / Dip", 1, "12 phút · mỗi phút ~50% max reps", 90, { emom: 12, tip: "Phút lẻ Pull-Up, phút chẵn Dip. Làm xong thì rest hết phút" }),
    E("Rope Straight-Arm Pulldown", 3, "12–15 reps", 60, { tip: "Tay gần thẳng, kéo từ trên đầu xuống đùi" }),
    E("Single-Arm Kettlebell Overhead Press (8 kg)", 3, "12–15 reps mỗi tay", 60),
    E("Dumbbell Hammer Curl (5 kg)", 3, "12–15 reps", 0, { ss: "SS1" }),
    E("Diamond Push-Up", 3, "AMRAP", 60, { ss: "SS1" }),
    E("Kettlebell Swing Finisher (12 kg)", 1, "50 reps, ít rest nhất", 0, { tip: "Finisher: ghi thời gian, lần sau nhanh hơn" })] },
  stretch: { name: "Mobility", full: "Mobility + Weigh-in", c: "var(--stretch)", g: "linear-gradient(150deg,#F55FA0 0%,#DC3F86 52%,#B52A6C 100%)", deep: "#B8306F", ic: "stretch", dur: "20 phút", ex: [
    E("Full-Body Mobility & Stretching", 1, "15–20 phút", 0, { tip: "Hamstrings, hip flexors, ngực, vai" }),
    E("Dead Hang", 3, "30 giây", 30, { dur: 30 }),
    E("Weigh-in & Waist Measurement", 1, "buổi sáng", 0, { tip: "Ghi ở tab Tiến độ" })] },
  rest: { name: "Rest Day", full: "Rest Day", c: "var(--walk)", g: "linear-gradient(150deg,#16B9AC 0%,#0C9890 52%,#0A737A 100%)", deep: "#087A78", ic: "walk", dur: "", ex: [] }
};

/** Daily mini circuit: 3 rounds. Push-Up is dropped on Push and Upper days. */
export const MINI = [E("Push-Up", 3, "~50–60% max reps", 0, { push: 1 }), E("Hollow Body Hold", 3, "30 giây", 0, { dur: 30 }), E("Crunch", 3, "15 reps", 60)];

/** Monday → Sunday. */
export const WEEK = [["T2", "rest"], ["T3", "push"], ["T4", "pull"], ["T5", "rest"], ["T6", "legs"], ["T7", "upper"], ["CN", "stretch"]];
export const DAYN = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];
/** Sessions that count as a strength session. */
export const LIFT = ["push", "pull", "legs", "upper"];

/** Six phases over twelve weeks. */
export const PH = [
  { w: [1, 2], t: "Adaptation", c: "var(--pull)", p: "Main lift 4 sets, RPE 7 (còn 3 reps in reserve), chưa drop set. Tuần 1 làm Max Test. Incline walk: rest day 25', sau strength 10', incline 8%." },
  { w: [3, 4], t: "Build", c: "var(--mini)", p: "Full program, RPE 8–9 (1–2 reps in reserve), bắt đầu drop set & rest-pause. Incline walk: rest day 35', sau strength 15', incline 10%." },
  { w: [5, 5], t: "Deload", c: "var(--walk)", p: "Giữ bài, volume giảm một nửa (½ số set), RPE 6. Incline walk 10–20', incline 5–6%. Trùng Giáng sinh." },
  { w: [6, 9], t: "Intensification", c: "var(--push)", p: "Progressive overload: weighted pull-up/dip với kettlebell 8 kg khi đủ reps, chuyển progression khó hơn, EMOM +1 rep mỗi tuần. Incline walk: rest day 40', sau strength 20', incline 10–12%." },
  { w: [10, 10], t: "Deload", c: "var(--walk)", p: "Volume giảm một nửa để recovery trước chặng cuối." },
  { w: [11, 12], t: "Peak", c: "var(--legs)", p: "Giữ intensity cao. Tết khoảng 06/02 rơi vào tuần 11; nghỉ thì dời lịch 1 tuần. Cuối tuần 12 làm lại Max Test. Incline walk: rest day 45', sau strength 20'." }
];

export const TESTS = [["pu", "Pull-Up (max reps)"], ["dp", "Dip (max reps)"], ["ps", "Push-Up (max reps)"], ["pl", "Plank (giây)"]];

/** Weekly targets from the plan's Tracking table. */
export const GOALS = { lifts: 4, walkPct: 0.9, miniDays: 5 };

/** Progression ladders. Key = "<session>-<exercise index>", index 0 = level 1 (the exercise in S). */
export const PL = {
  "push-0": ["Parallel Bar Dip", "Weighted Dip (8 kg)", "Weighted Dip (12 kg)", "Tempo Weighted Dip (3s eccentric, 12 kg)", "Korean Dip"],
  "push-1": ["Single-Arm Kettlebell Overhead Press (12 kg)", "Bottoms-Up Kettlebell Press (8 kg)", "Pike Push-Up", "Elevated Pike Push-Up", "Wall Handstand Push-Up (negative)", "Wall Handstand Push-Up"],
  "push-2": ["Feet-Elevated Push-Up", "Deficit Push-Up", "Pause Deficit Push-Up (2s)", "Archer Push-Up", "Pseudo Planche Push-Up"],
  "push-3": ["Single-Arm High-to-Low Cable Fly", "Single-Arm High-to-Low Cable Fly (+1 đĩa)", "Single-Arm High-to-Low Cable Fly (+2 đĩa)", "Tempo Cable Fly (3s eccentric, +2 đĩa)"],
  "push-4": ["Dumbbell Lateral Raise (5 kg)", "Lean-Away Dumbbell Lateral Raise (5 kg)", "Single-Arm Cable Lateral Raise", "Single-Arm Cable Lateral Raise (+1 đĩa)"],
  "push-5": ["Rope Triceps Pushdown", "Rope Triceps Pushdown (+1 đĩa)", "Rope Overhead Triceps Extension", "Rope Overhead Triceps Extension (+1 đĩa)"],
  "pull-0": ["Pull-Up", "Weighted Pull-Up (8 kg)", "Weighted Pull-Up (12 kg)", "L-Sit Pull-Up", "Archer Pull-Up", "Typewriter Pull-Up"],
  "pull-1": ["Half-Kneeling Single-Arm Lat Pulldown", "Half-Kneeling Single-Arm Lat Pulldown (+1 đĩa)", "Half-Kneeling Single-Arm Lat Pulldown (+2 đĩa)", "Tempo Lat Pulldown (3s eccentric, +2 đĩa)"],
  "pull-2": ["Hanging Knee Raise", "Hanging Leg Raise", "Toes-to-Bar", "Hanging Windshield Wiper"],
  "pull-3": ["Single-Arm Kettlebell Row (12 kg)", "Tempo Kettlebell Row (3s eccentric, 12 kg)", "Single-Arm Kettlebell Row (16 kg)*", "Single-Arm Kettlebell Row (20 kg)*"],
  "pull-4": ["Rope Face Pull", "Rope Face Pull (+1 đĩa)", "Face Pull + External Rotation", "Face Pull + External Rotation (+1 đĩa)"],
  "pull-5": ["Dumbbell Biceps Curl (5 kg)", "Tempo Biceps Curl (4s eccentric, 5 kg)", "Kettlebell Biceps Curl (8 kg)", "Kettlebell Biceps Curl (12 kg)"],
  "legs-0": ["Kettlebell Goblet Squat (12 kg)", "Goblet Squat, 1¼ reps (12 kg)", "Kettlebell Goblet Squat (16 kg)*", "Assisted Pistol Squat", "Pistol Squat"],
  "legs-1": ["Dumbbell Bulgarian Split Squat (2 × 5 kg)", "Kettlebell Bulgarian Split Squat (12 kg)", "Kettlebell Bulgarian Split Squat (8 + 12 kg)", "Deficit Bulgarian Split Squat (8 + 12 kg)", "Shrimp Squat"],
  "legs-2": ["Single-Leg Kettlebell RDL (12 kg)", "Single-Leg Kettlebell RDL, pause 2s (12 kg)", "Single-Leg RDL (8 + 12 kg)", "Nordic Hamstring Curl (eccentric)", "Nordic Hamstring Curl"],
  "legs-3": ["Kettlebell Swing (12 kg)", "Single-Arm Kettlebell Swing (12 kg)", "Kettlebell Swing (16 kg)*", "Kettlebell Swing (20 kg)*"],
  "legs-4": ["Single-Leg Calf Raise", "Deficit Single-Leg Calf Raise", "Deficit Calf Raise + kettlebell 12 kg", "Deficit Calf Raise, pause 3s (12 kg)"],
  "legs-5": ["Side Plank", "Side Plank + Hip Dip", "Copenhagen Plank (short lever)", "Copenhagen Plank"],
  "upper-0": [{ n: "EMOM: Pull-Up / Dip", emom: 12 }, { n: "EMOM 15': Pull-Up / Dip", emom: 15 }, { n: "EMOM: Weighted Pull-Up / Dip (8 kg)", emom: 12 }, { n: "EMOM 15': Weighted Pull-Up / Dip (8 kg)", emom: 15 }],
  "upper-1": ["Rope Straight-Arm Pulldown", "Rope Straight-Arm Pulldown (+1 đĩa)", "Rope Straight-Arm Pulldown (+2 đĩa)", "Tempo Straight-Arm Pulldown (3s eccentric, +2 đĩa)"],
  "upper-2": ["Single-Arm Kettlebell Overhead Press (8 kg)", "Single-Arm Kettlebell Overhead Press (12 kg)", "Kettlebell Push Press (12 kg)", "Bottoms-Up Kettlebell Press (12 kg)"],
  "upper-3": ["Dumbbell Hammer Curl (5 kg)", "Tempo Hammer Curl (4s eccentric, 5 kg)", "Kettlebell Hammer Curl (8 kg)", "Kettlebell Hammer Curl (12 kg)"],
  "upper-4": ["Diamond Push-Up", "Feet-Elevated Diamond Push-Up", "Pause Diamond Push-Up (2s)", "Tiger Bend Push-Up"],
  "upper-5": ["Kettlebell Swing Finisher (12 kg)", "Swing Finisher: 75 reps (12 kg)", "Swing Finisher: 100 reps (12 kg)", "Kettlebell Swing Finisher (16 kg)*"]
};
