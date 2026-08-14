# Mobile-first Report Readability Design

**Date:** 2026-08-14  
**Status:** Approved direction, awaiting written-spec review

## Goal

Make the career-saju result screen easier to scan on mobile while preserving nearly the same reading flow on desktop. Restore the character as the visual focal point, reduce decorative competition, and turn long report text into a clear decision-oriented sequence.

## Scope

This change covers the result screen presentation only:

- character hero size, framing, and visual contrast;
- responsive content width and typography;
- premium report hierarchy, paragraph treatment, and card order;
- compact-screen behavior at 320px and desktop behavior above the mobile breakpoint.

It does not change saju calculations, report data, payment/unlock behavior, sharing behavior, API calls, or the meaning of generated copy.

## Responsive Layout

The result remains a centered single-column report at every viewport size so mobile and desktop share one information architecture.

- At widths below 480px, the content uses the available viewport with 16 to 20px horizontal gutters.
- From 480px upward, the report grows gradually but stops at a 540px maximum width.
- Desktop does not introduce sidebars, multi-column report sections, or larger desktop-only type scales.
- Cards use the same order, spacing rhythm, and typography hierarchy on mobile and desktop.
- Two-column detail grids collapse to one column at 360px or when their contents cannot maintain readable line lengths.

## Character Hero

The character becomes the first visual focal point after the result header.

- Increase the stage from approximately 74vw/280px to approximately 82vw with a 340px maximum.
- Increase the character artwork occupancy from 72% to roughly 82 to 86% of the stage.
- Reduce the frame from a vivid 2px tone border to a quiet 1px low-saturation border.
- Reduce the radial glow and remove the outer highlight ring; keep only a soft shadow needed to separate the artwork from the background.
- Keep the score-tone badge, but lower its border saturation and size so it reads as metadata rather than the primary visual.
- Do not artificially saturate the source artwork. Focus is created through scale and quieter surroundings, preserving the character asset's intended palette.

## Information Hierarchy and Card Order

The report follows a decision-first sequence:

1. Character hero
2. Main verdict
3. Strongest career flow
4. Three-score comparison
5. Immediate next action
6. Current-month brief
7. Paid-report intent and decision factors
8. One-line paid conclusion
9. Personal answer
10. Current dilemma
11. Career nature and strengths/cautions
12. Three career paths
13. Ideal environment
14. Action plan and timing
15. Technical evidence such as the four pillars
16. Follow-up question and share/collection content

Technical evidence moves below the decision-oriented report. It remains available but uses lower visual emphasis because it explains the result rather than leading it.

## Long-form Reading Treatment

Each premium card uses a consistent internal hierarchy:

- small section label and report number;
- a clear 20 to 22px card title;
- an optional short key takeaway styled as a distinct summary block when structured summary data exists;
- body copy at 15px with approximately 1.75 line height;
- visible paragraph spacing of 12 to 16px;
- lists and comparison blocks for structured items instead of embedding them in prose.

Existing newline-delimited report content is rendered as separate paragraphs. The implementation must not rewrite or truncate generated content merely to fit the layout. If content has no paragraph breaks, it remains intact rather than applying unreliable sentence-based splitting.

## Visual System

- Keep the current matte navy base and indigo accent.
- Lower decorative border brightness across result cards, especially around the character and secondary evidence.
- Reserve the strongest accent for the primary score, main action, and interactive focus states.
- Use the Korean serif face only for the character title, main verdict, and selected conclusion lines; body content remains sans-serif.
- Increase vertical separation between major report groups while slightly reducing repeated card decoration.
- Maintain at least 44px interactive targets and visible keyboard focus styles.

## Component and Implementation Boundaries

- Keep domain calculations and API state in `src/App.tsx` unchanged.
- Introduce a small presentation helper/component for newline-delimited report paragraphs so all long-form cards use the same markup.
- Move result-screen inline presentation styles into named CSS classes where those styles must participate in responsive behavior.
- Keep existing card components/data structures; only reorder presentation blocks when dependencies permit.
- If moving the evidence block across the locked boundary would alter free/paid access, preserve its access level and place it at the latest position allowed within that boundary. Access semantics take priority over exact visual order.

## Accessibility and Edge Cases

- Preserve meaningful headings in descending hierarchy without skipping levels for visual reasons.
- Decorative character artwork stays hidden from assistive technology because the adjacent character title supplies the meaning.
- At 320px, badges must not overflow the character stage and all cards must remain within the viewport.
- Long Korean words use `word-break: keep-all` with safe overflow wrapping as a fallback.
- Reduced-motion behavior remains unchanged.
- Layout must tolerate missing optional report sections without leaving numbering-dependent gaps or broken spacing.

## Verification

- Add unit coverage for the paragraph presentation helper if a new helper is introduced.
- Run the existing test suite, lint, TypeScript build, and production build.
- Inspect the result screen at 320px, 390px, 540px, and a desktop viewport.
- Confirm the character is visually dominant without changing the source asset.
- Confirm long-form cards show clear title/body separation and paragraph spacing.
- Confirm the same card order and typography hierarchy appear on mobile and desktop.
- Confirm payment, unlock, API, sharing, and result calculation behavior are untouched.

## Acceptance Criteria

- The character occupies more visual area than its frame and the frame no longer competes through saturation.
- Mobile is the canonical layout; desktop is the same layout with a maximum width of 540px.
- Body copy is at least 15px on the result report and no long-form card appears as an undifferentiated wall of text when source paragraph breaks exist.
- Decision content precedes technical evidence.
- The page remains usable at 320px without horizontal scrolling.
- Existing functional checks pass with no behavior changes outside presentation.
