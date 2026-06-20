# Tripp.reason (goose) Deep Audit Plan

## Project Overview
This is the "goose" AI coding agent framework by Block (formerly Square). It's a Rust-based
multi-crate workspace with CLI, server, SDK, MCP tools, and provider integrations.

## Repository Structure (from tree analysis)
- **2849 files** total
- **~10 crates** in the workspace
- **UI layer** (desktop app, web UI)
- **Documentation**
- **Evaluations/harnesses**
- **Examples**

## Crates Identified
1. `goose` - Core agent crate
2. `goose-cli` - Command-line interface
3. `goose-server` - API server (goosed)
4. `goose-sdk` - Rust SDK for ACP protocol
5. `goose-mcp` - MCP (Model Context Protocol) tools
6. `goose-acp-macros` - Procedural macros for ACP
7. `goose-test` - Test crate
8. `goose-test-support` - Test utilities
9. `ui/desktop` - Desktop UI (Electron/Tauri)
10. `ui/goose-binary` - Binary distribution
11. `ui/sdk` - UI SDK
12. `ui/text` - Text UI
13. `vendor/v8` - V8 JavaScript engine

## Audit Stages

### Stage 1: Architecture Deep Dive (Parallel)
- Agent A: Core goose crate - providers, agent logic, model list
- Agent B: goose-server - API, websocket, authentication
- Agent C: goose-cli - commands, session, recipe system
- Agent D: goose-mcp - MCP tools, extensions
- Agent E: UI layer - desktop, web interfaces
- Agent F: Documentation, harnesses, examples

### Stage 2: Gap Analysis & Connection Plan
- Identify disconnected components
- Map dependencies between crates
- Document model/provider support
- Identify unnecessary components for LEAN harness

### Stage 3: LEAN Harness Design
- Design minimal harness architecture
- Keep: Core agent + server + essential providers + MCP
- Remove: UI layers, heavy dependencies, optional features
- Plan for OpenClaw/Hermes agent integration

### Stage 4: Final Report
- Comprehensive documentation
- Architecture diagrams
- Connection plan
- LEAN harness specification
