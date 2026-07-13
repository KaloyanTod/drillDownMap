// -----------------------------------------------------------------------------
// Compatibility shim
// -----------------------------------------------------------------------------
// The component was refactored into the `src/drilldown/` package (see
// src/drilldown/README.md). This file is kept only so existing imports of
// `./assets/DrillDownMap` keep working. Prefer importing from '../drilldown'
// in new code.
export { default } from '../drilldown';
