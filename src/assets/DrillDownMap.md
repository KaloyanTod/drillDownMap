# DrillDownMap — moved

The `DrillDownMap` component was refactored from a single ~775-line file into a
structured, extensible package at [`src/drilldown/`](../drilldown/).

**Documentation now lives in [`src/drilldown/README.md`](../drilldown/README.md)** —
it covers the architecture, props, and how to associate data with each map
element to build your own report.

`src/assets/DrillDownMap.jsx` is now just a re-export shim so existing imports
keep working; import from `../drilldown` in new code.
