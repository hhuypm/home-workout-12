/* Exercise pictures. Two photos per exercise (start and end position) stored with the app, so they work offline.
 * Photos: free-exercise-db (https://github.com/yuhonas/free-exercise-db), published by its maintainers as public domain.
 *
 * Harder variants in the progression ladders mostly have no photo of their own; they show the closest basic exercise
 * and say so (`approx`). Exercises with no good photo (dead hang, hollow hold, mobility) show a note instead. */

export const DIR = "exercises/";

/** [name pattern, photo folder or null, pattern of names the photo shows exactly (omit: always exact)] — first match wins. */
const RULES = [
  [/EMOM/i, "Pullups", /^$/],
  [/Pistol Squat/i, "Kettlebell_Pistol_Squat", /^Pistol Squat$/i],
  [/Nordic/i, null],
  [/Pull-Up/i, "Pullups", /^Pull-Up$/i],
  [/\bDip\b/i, "Parallel_Bar_Dip", /^Parallel Bar Dip$/i],
  [/Handstand Push-Up|Pike Push-Up/i, "Handstand_Push-Ups", /^Wall Handstand Push-Up$/i],
  [/Diamond Push-Up|Tiger Bend/i, "Push-Ups_-_Close_Triceps_Position", /^Diamond Push-Up$/i],
  [/Feet-Elevated Push-Up/i, "Decline_Push-Up"],
  [/Deficit Push-Up|Archer Push-Up|Planche/i, "Pushups", /^$/],
  [/^Push-Up/i, "Pushups"],
  [/Kettlebell Push Press/i, "One-Arm_Kettlebell_Push_Press"],
  [/Kettlebell (Overhead )?Press/i, "Alternating_Kettlebell_Press", /^Single-Arm Kettlebell Overhead Press$/i],
  [/Cable Fly/i, "Single-Arm_Cable_Crossover", /^Single-Arm High-to-Low Cable Fly$/i],
  [/Cable Lateral Raise/i, "Cable_Seated_Lateral_Raise", /^$/],
  [/Lateral Raise/i, "Side_Lateral_Raise", /^Dumbbell Lateral Raise$/i],
  [/Overhead Triceps Extension/i, "Cable_Rope_Overhead_Triceps_Extension"],
  [/Triceps Pushdown/i, "Triceps_Pushdown_-_Rope_Attachment"],
  [/Straight-Arm Pulldown/i, "Straight-Arm_Pulldown"],
  [/Lat Pulldown/i, "One_Arm_Lat_Pulldown", /^$/],
  [/Hanging|Toes-to-Bar/i, "Hanging_Leg_Raise", /^Hanging (Leg|Knee) Raise$/i],
  [/Kettlebell Row/i, "One-Arm_Kettlebell_Row", /^Single-Arm Kettlebell Row$/i],
  [/Face Pull/i, "Face_Pull", /^Rope Face Pull$/i],
  [/Hammer Curl/i, "Hammer_Curls", /^Dumbbell Hammer Curl$/i],
  [/Biceps Curl/i, "Dumbbell_Bicep_Curl", /^Dumbbell Biceps Curl$/i],
  [/Goblet Squat/i, "Goblet_Squat", /^Kettlebell Goblet Squat$/i],
  [/Rear Delt Fly|Reverse Fly/i, "Seated_Bent-Over_Rear_Delt_Raise", /^Dumbbell Rear Delt Fly$/i],
  [/Reverse Lunge/i, "Dumbbell_Rear_Lunge", /^$/],
  [/Shrimp/i, "Kettlebell_Pistol_Squat", /^$/],
  [/Glute Bridge|Hip Thrust/i, "Single_Leg_Glute_Bridge", /^Single-Leg Glute Bridge$/i],
  [/Swing/i, "One-Arm_Kettlebell_Swings", /^$/],
  [/Calf Raise/i, "Calf_Raise_On_A_Dumbbell", /^$/],
  [/Side Plank|Copenhagen/i, "Side_Bridge", /^Side Plank$/i],
  [/Crunch/i, "Crunches"]
];

/** The name without weights and brackets: "Weighted Dip (8 kg)" -> "Weighted Dip". */
const plain = n => n.replace(/\s*\([^)]*\)/g, "").replace(/\*$/, "").trim();

/** Photo for an exercise name: { id, approx, frames: [startUrl, endUrl] } or null. */
export function mediaFor(name) {
  const rule = RULES.find(([re]) => re.test(name));
  if (!rule || !rule[1]) return null;
  const [, id, exact] = rule;
  return { id, approx: exact ? !exact.test(plain(name)) : false, frames: [`${DIR}${id}/0.webp`, `${DIR}${id}/1.webp`] };
}

/** Every photo the app can show, for storing on the device ahead of time. */
export const allImageUrls = () => [...new Set(RULES.filter(r => r[1]).map(r => r[1]))].flatMap(id => [`${DIR}${id}/0.webp`, `${DIR}${id}/1.webp`]);
