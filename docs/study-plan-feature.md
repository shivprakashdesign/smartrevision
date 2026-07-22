# Guided Study Plan — build plan

Turn a Class 12 student's input (and their self-built [JEE Console tracker](https://—)) into a
SmartRevision feature: pick from a **hardcoded syllabus**, answer a few questions, and get a
**weighted weekly calendar** — time per topic decided by **official board/JEE importance**, not AI.

## Locked decisions
- **Plan first**, build across sessions (each step below ≈ one PR).
- Hardcoded syllabus **sits alongside** scan/manual — it's a fast-start picker, scan & manual still
  cover anything the tree doesn't have. The existing "scan builds your plan" golden path stays intact.
- Importance weights: **I compile public JEE/CBSE weightage into a table, you verify before ship.**

## What already exists (reuse, don't rebuild)
| Spec bullet | Status in app | File |
|---|---|---|
| Ask class | ✅ onboarding grade picker | `Onboarding.jsx` `school` step |
| Ask subject | ✅ but names only, no topic tree | `subjects.js` `BY_GOAL` |
| Ask exam date | ✅ stored on `students.exam_date` | `Onboarding.jsx` `schedule` step |
| Time left to exam | ✅ `daysUntilExam()` | `schedule.js:27` |
| Exam-date-aware scheduling | ✅ review cycle truncates past exam | `schedule.js:41` |
| Study days (rest days) | ✅ `students.study_days` | `Onboarding.jsx` `schedule` step |

## What's new (this feature)
1. **Hardcoded syllabus tree** — topic → chapter → subtopic per class+board+subject, filtered to the
   student. (The student's HTML `CHAPTERS` object is the reference shape.)
2. **Daily self-study time** input.
3. **Subject weakness** input — distinct from today's habit "blockers".
4. **Importance-weighted time allocation** from hardcoded official weightage.
5. **Weekly calendar** output.
6. **Lower class = homework / higher class = self-study** framing.

---

## Data model

### 1. Static syllabus — new `src/lib/syllabus.js`
```
SYLLABUS = {
  CBSE: {
    12: {
      Physics:   [ { id, chapter, boardMarks, jeeWeight, subtopics:[{id,label,type}] }, … ],
      Chemistry: [ … ],
      Maths:     [ … ]
    },
    11: { … }, 10: { Science:[…], Maths:[…], … }
  }
}
```
- **Start with Class 12 CBSE PCM** (matches the student). Structure supports 11/10/9 + other subjects later.
- `boardMarks` = unit marks from the official CBSE curriculum PDF; `jeeWeight` = published JEE Main
  chapter-wise weightage %. Engine picks the lens (board vs JEE) per plan.
- Filtered by the student's class + selected subjects at runtime — this is the spec's "filter out
  other class/subject data".

### 2. New student inputs
- **Daily self-study time** → `students.daily_study_min`.
- **Subject weakness** → `students.weak_subjects` (v1: subject-level; chapter-level later). Weak → time multiplier.
- **Exam lens** (board vs JEE) → inferred from the existing `preparing_for` goal, confirmable. A Class 12
  JEE student has *both* board and JEE; v1 builds one plan against one lens.

### 3. Allocation engine — new `src/lib/studyPlan.js` (pure, unit-tested)
Follows the repo's `forecast.test.js` pattern: pure functions, decisions pinned in tests.
```
buildPlan({ chapters, daysUntilExam, studyDays, dailyStudyMin, weakSubjects, lens }) → {
  weeks: [{ start, end, items:[{ subj, chapter, subtopic, minutes }] }],
  perChapterMinutes, buffer
}
```
- Total minutes = study-days-until-exam × dailyStudyMin (honours rest days).
- Per-chapter time ∝ `weight(lens) × weaknessMultiplier × subtopicCount`.
- Reserve a buffer (student's HTML uses 12%).
- Pack chapters into weeks so each week's summed time fits its capacity → the weekly calendar.
- On "learned", hand the chapter to the **existing** revision engine (`schedule.js`) for its review cycle.

### 4. Weekly calendar UI
Extend `Plan.jsx` (or a new screen) with week/day cards like the student's planner; feeds Home.

---

## Build steps (each ≈ one session/PR) — ✅ SHIPPED
1. ✅ **Weightage research + `syllabus.js`** — Class 12 CBSE PCM, both `jeeQ` and `boardMarks`, user-verified.
2. ✅ **`studyPlan.js` engine + tests** — subtopic-level weighted allocation, 11 tests.
3. ✅ **New inputs** — daily study time + subject weakness + exam-lens in `StudyPlanSettings` (post-auth, not the funnel); `supabase_study_plan_inputs.sql`.
4. ✅ **Syllabus picker** — `SyllabusPicker.jsx` (`/pick-syllabus`), writes `plan_items` alongside scan.
5. ✅ **Weekly-calendar screen** — `StudyCalendar.jsx` (`/calendar`), runs the engine over plan_items; integration-tested.
6. ↪ **Redefined** — see "Homework mode" below. Was "homework vs self-study copy"; that was hollow (no lower-class surface exists) so it became its own feature spec.

Decisions locked: board = CBSE only to start · exam lens = **JEE first** (board data also loaded, side by side) · weakness = subject-level v1.

---

## Homework mode — separate future feature (not built)

The self-study feature above allocates a fixed pool of time across an exam syllabus by
**weightage**. That's the right model for Class 11–12 / JEE. It is the **wrong** model for
Class 6–8, whose daily reality is **assignments with due dates**, not weightage allocation —
and who are often **parent-managed** (the app already has a parent mode built for this band).
So homework isn't a relabel of self-study; it's a different feature that shares only the
revision engine and the streak/notification plumbing. The **class band selects the mode.**

**Core idea.** Homework is the *capture surface* for younger kids — the equivalent of what
photo-scan / the syllabus picker is for older ones. A finished homework item that taught a
concept can become a **topic** (entering the same spaced-revision cycle), so homework mode
feeds the core forgetting-curve loop instead of being a bolted-on to-do list.

**Data model (future migration).**
- `homework_items`: `student_id`, `subject`, `title`, `due_date`, `status` (assigned → done),
  `source` (nullable link to a topic/chapter), `created_by` (student | parent), `created_at`.
- Distinct from `plan_items` (term-level chapter checklist) and `topics` (spaced-revision units):
  homework is **date-bound and short-lived**.

**Flows.**
- Add homework — quick: subject + title + due date (student or parent).
- "Due this week" list, grouped by due date, tickable.
- On complete → *"Want to remember this?"* → creates a topic → revision cycle. (The bridge.)
- Reuse existing **push notifications** ("Homework due tomorrow") and **streak/gems**
  (`record_activity` on completion).

**Parent angle.** Parent adds/reviews a child's homework and sees done/not-done — fits the
existing parent-managed profile model; younger kids stay off leaderboards as they do today.

**Open questions.** Exact class-band cutoff (≤8? ≤10?) · student- vs parent-created default ·
auto-suggest homework → topic, or always ask · recurring/weekly homework.

**Prerequisite.** Worth building once there's a real lower-class audience — pairs naturally
with adding a lower-class syllabus so the mode selector has both sides to switch between.
