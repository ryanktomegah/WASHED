# GitHub Security Settings

**Date checked:** 2026-04-30
**Repository:** `ryanktomegah/WASHED`

## Enabled Settings

| Setting | Status | Evidence |
|---|---|---|
| Secret scanning | Enabled | GitHub API `security_and_analysis.secret_scanning.status=enabled` |
| Secret scanning push protection | Enabled | GitHub API `security_and_analysis.secret_scanning_push_protection.status=enabled` |
| Dependabot security updates | Enabled | GitHub API `security_and_analysis.dependabot_security_updates.status=enabled` |
| Dependabot update config | Enabled in repo | `.github/dependabot.yml` |
| Main branch required status check | Enabled | Branch protection requires `verify` |
| Main branch force pushes | Disabled | Branch protection `allow_force_pushes=false` |
| Main branch deletion | Disabled | Branch protection `allow_deletions=false` |

## Notes

- The repository is public.
- Required status checks are strict, so branches must be up to date with `main`.
- Admin enforcement is currently disabled so the founder can recover the repository if needed.
- GitHub still reports Node 20 deprecation annotations for third-party action packages, but the workflow forces JavaScript actions to run on Node 24.
