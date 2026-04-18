# Decision log

Append-only. Each entry captures a binding product/architecture call so
future phases don't relitigate.

## 2026-04-18 · Schema v1.0.0 frozen

`artifacts/schema.json` v1.0.0 is the canonical data model. Approved at
Phase 1. Additive-only until V1.1 — no renames, no deletions, no type
changes on approved fields. Deprecate via nullable additions.

## 2026-04-18 · Agent model: all Opus

All six agents in `.claude/agents/` run on `opus`. Rationale: code quality
and security rigor outweigh the cost delta at V1 build scale. Revisit after
Phase 14 if token spend is a concern.

## 2026-04-18 · Classifier model: Sonnet, not Haiku

Page-1 vendor classifier (`src/lib/llm/classifier.ts`) runs on
`claude-sonnet-4-6`. Original plan called for Haiku 4.5 to save tokens.
User directive: prioritize classification accuracy on noisy OCR over
token cost; revisit after we see cohort accuracy numbers.

## 2026-04-18 · Free calculator cohort gate: softened

Phase 9 free single-scope calculator originally required cohort
contribution *before* showing results. Decision: **soften to opt-out
default-on**.

- Checkbox "Contribute anonymized data to the public cohort" is **checked
  by default** on the calculator form.
- User may uncheck and still see their threshold result.
- Anonymization rule is unchanged: never persist serial, asset tag, or
  internal id; bucket replacement cost to nearest $500; drop dates finer
  than month.
- Dashboard still surfaces cohort benchmarks regardless of individual
  contribution status.

Rationale: hard gate creates a bounce incentive; opt-out default-on
captures ~the same cohort volume in practice while respecting users who
decline.
