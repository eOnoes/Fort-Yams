# LOCK 009 — Governance Trace + Decision Record (Extracted Spec)

## Objective
Implement deterministic governance trace / decision record layer for Tripp.Control.

## Input
Output from LOCK 008 `runGovernancePipeline(input)`:
- status, task_id, classification, routing, escalation, candidates, reports, warnings, summary

## Required Output
Decision record with:
- status, trace_id, task_id, decision, next_action
- selected_model, selected_agent
- requires_human_review, requires_premium_justification
- module_outputs (classification, routing, escalation, candidates, reports)
- decision_factors, evidence, warnings, review_items
- promotion_allowed: false, mutation_allowed: false

## Deterministic Rules
- trace_id must be deterministic: `trace-[task_id]`
- No Date.now(), Math.random(), UUID generation
- Same input → same trace_id

## Evidence Collection
From child modules:
- classification.reasons, classification.warnings
- routing.reasons, routing.warnings
- escalation.reason_codes, escalation.warnings
- candidate.evidence, candidate.reason_codes
- report warnings, pipeline warnings

## Decision Factors
Human-readable strings explaining why next_action exists.

## Review Items
Added when:
- requires_human_review = true
- requires_premium_justification = true
- decision = ESCALATE/STOP/HUMAN_REVIEW
- candidate_count > 0
- warnings present
- reports contain missing fields

## Safety Flags
- promotion_allowed: false (always in LOCK 009)
- mutation_allowed: false (always in LOCK 009)

## Input Tolerance
Must not crash on:
- null, {}, {task_id}, {summary}, {warnings}, {candidates}

## Forbidden
- No live model calls
- No file writes (except Markdown report)
- No persistence layer
- No provider/API/database/dashboard/runtime work
- No candidate promotion
- No config/governance mutation

## Tests
14 required test cases covering null input, deterministic IDs, field presence, evidence collection, review items, safety flags.

## Report
`reports/LOCK-009-governance-trace-decision-record-REPORT.md`
