# Mobile navigation and login review

Latest requested state (local, not published): the hamburger-menu increment is reversed, restoring the previous panel toggles and compact icon navigation. The dark theme is fixed and its toggle removed. The user/security link appears at the right of a black top bar; workspace selector, New workspace and logout stay on one row. Selector width follows the selected name in character units, bounded by the available viewport. No permissions or editor guards changed.

The actual BOSS /login form now has the explicitly requested editable default email and an inline Eye/EyeOff button with accessible name, pressed state and keyboard support. Password starts empty and masked; username/current-password autocomplete remains. No password is stored. The default email is shared UI configuration, not an account change or authentication bypass.

Eight isolated browser tests passed: desktop navigation and simulated revocation, restored menus/topbar at 320/390/768px, and login at 320/390/1280px. Checks cover bounds/alignment, modal entry through unsaved-editor confirmation, draft preservation, editable email, inline icon bounds and keyboard visibility toggle. APIs were mocked and no real accounts/data were modified. The final 320px application screenshot was visually inspected. Lint, TypeScript and build passed. Original attached screenshot pixels were unavailable from Library; implementation follows the explicit textual request.

Previous preview changes are preserved. No new push, deployment or migration is included in this revision. Production verification remains blocked by the executor proxy (CONNECT 403); no Netlify panel tool is available. Unrelated existing login diagnostics are excluded from this revision.


## Header alignment follow-up

The principal-menu toggle, authenticated user/security link and logout now share the first black header row at all viewport widths. Logout is the rightmost control, adjacent to the name, and no longer occupies the workspace row. At narrow widths the menu label is visually hidden while its accessible name and prior panel icon remain; this does not reintroduce hamburger menus. Long user names truncate instead of overflowing. Existing navigation, logout and unsaved-edit confirmation handlers are unchanged.

The coordinator confirmed production at a7a99a4 before this follow-up. This follow-up remains local pending publication approval. Validation covers 320, 390, 768 and 1280px, same-row coordinates, right-edge logout, independent menu controls, and canceling logout with an unsaved draft. API data is synthetic/mocked; no real session was ended.

Final follow-up checks: lint, TypeScript, build and all nine browser tests passed. The first desktop run exposed a test assumption that the area menu starts collapsed; the test now verifies its existing expanded desktop default before toggling. No runtime change was needed for that assertion. Final 320px screenshot was inspected; no horizontal overflow or header wrapping observed.
