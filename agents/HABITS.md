# HABITS agent contract

## Purpose

Coordinate HabitQuest inside Segundo Cerebro while keeping the original Google Sheet as the single source of truth.

## Source of truth

- Spreadsheet: the existing HabitQuest workbook.
- Core tabs: `Habits`, `History`, `Meta`, `SyncState`.
- `SyncState` remains the append-only multi-device action log.
- Daily mark/unmark resolution is Last-Write-Wins by `habitId + date + updatedAt`.
- Segundo Cerebro must never create a parallel habit database.

## Supported operations

Segundo Cerebro supports the operational HabitQuest surface:

- mark and unmark scheduled habits, including `timesPerDay`;
- browse previous days;
- create and edit habits;
- frequency, custom weekdays, reminder, difficulty and XP reward;
- archive / restore while keeping history;
- delete together with the habit history and SyncState rows;
- manual reorder;
- list / compact presentation and display sorting;
- XP, levels, overall streak and longest streak;
- per-habit completion rate, current streak and total completions;
- weekly completion, 90-day completion rate and five-week consistency map;
- achievements compatible with the current HabitQuest definitions;
- completion feedback such as haptics, XP toast, confetti and level-up UI.

## Presentation preferences

`list/compact` and display sorting in Segundo Cerebro are UI preferences, not domain data. They may be stored locally by Segundo Cerebro. The Sheet remains authoritative for habit records and completion state.

## Features intentionally not duplicated

Segundo Cerebro does not reproduce infrastructure that only exists because HabitQuest is a standalone app:

- Google sign-in / manual sync controls;
- onboarding and sample journey;
- independent light/dark theme selector;
- XLSX import/export;
- standalone profile/photo management.

These remain in HabitQuest while the standalone app is retained as fallback.

## Streak freezes

The Sheet may contain `streakFreezes`, but the standalone HabitQuest code currently presents freeze UI without a complete, explicit consume/earn algorithm in the shared domain logic. Segundo Cerebro must not imply that freezes are active until that rule is formalized and tested.

## Retirement criterion

The standalone HabitQuest app can be considered for retirement only after Segundo Cerebro has been validated on iPhone, iPad and Mac against the same Sheet, with multi-device LWW behavior preserved and no regression in habit management or history.
