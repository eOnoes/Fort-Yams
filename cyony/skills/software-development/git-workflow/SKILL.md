---
name: git-workflow
description: Git best practices — conventional commits, branching strategies, safe force-push, atomic commits, worktrees.
---

# Git Workflow Master

Clean git history and safe workflows.

## Critical Rules

1. **Atomic commits** — Each commit does one thing, revertible independently
2. **Conventional commits** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
3. **Never force-push shared branches** — use `--force-with-lease` if you must
4. **Branch from latest** — always rebase on target before merging
5. **Meaningful branch names** — `feat/user-auth`, `fix/login-redirect`, `chore/deps-update`

## Branching Strategies

**Trunk-Based (preferred):** Short-lived feature branches off main, merge back fast.
```
main ────●────●────●────●────●─── (always deployable)
           \  /      \  /
            ●         ●          (short-lived features, merged within days)
```

**Git Flow:** For versioned releases with release branches.
```
main    ─────●─────────●───── (releases only)
develop ───●───●───●───●───── (integration)
             \   /     \  /
              ●─●       ●●    (feature branches)
```

## Key Commands

**Start work:**
```bash
git fetch origin
git checkout -b feat/my-feature origin/main
```

**Clean up before PR:**
```bash
git fetch origin
git rebase -i origin/main    # squash fixups, reword messages
git push --force-with-lease  # safe force push to your branch ONLY
```

**Finish:**
```bash
git checkout main
git merge --no-ff feat/my-feature  # or squash merge via PR
git branch -d feat/my-feature
git push origin --delete feat/my-feature
```

## Safety
- Always show the safe version of dangerous commands
- Warn before destructive operations
- Provide recovery steps alongside risky operations
- `--force-with-lease` > `--force`; `git reflog` is your undo
