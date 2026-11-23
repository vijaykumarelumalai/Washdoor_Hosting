# Orders & POS V2 – Pagination & UI Enhancement Acceptance Criteria

## Scope
Only the Orders & POS V2 list page presentation and pagination controls change:
`src/components/OrdersV2.jsx`, `src/components/OrdersV2List.jsx`, `src/styles/OrdersV2.css`,
their node tests, and this documentation. Order CRUD, Supabase access, payment math,
statuses, staff assignments, search, and filtering logic are untouched.

## 1. Pagination acceptance criteria
1. `pageSize` defaults to `10` in both `OrdersV2.jsx` state and the `OrdersV2List` prop fallback.
2. The rows-per-page selector offers exactly `10`, `20`, `50`, `100`. The `5` and `All` options are absent.
3. The range label renders `X–Y of N` for the active page (e.g. `1–10 of 40`) and updates with page and filter changes.
4. The table viewport stays fixed at 320px (40px header + 5 × 56px rows); a 10-row page is scrolled internally.
5. The pagination footer stays sticky at the bottom of the table (`position: sticky`, `bottom: 0`, `zIndex: 7`) with no trailing padding below it.
6. Only four controls render: First, Previous, Next, Last. No numbered page buttons, no `TablePagination`, no `aria-current` page items.
7. First/Previous are disabled on page 1; Next/Last are disabled on the last page; all four call the existing `onPageChange` handlers.
8. Changing rows per page resets the active page to 1.
9. The four navigation buttons sit consecutively in one row with a uniform 6px gap, no placeholder elements, margins, or reserved widths.

## 2. UI/UX acceptance criteria
1. Column order remains: Order ID, Customer, Services, Total Amount, Status, Order Date, Actions.
2. Header cells use compact MUI typography (`0.82rem`, weight 700, `0.02em` letter spacing), a subtle bottom border, and nowrap labels.
3. Rows keep a 56px height, a subtle blue hover (`#f8fbff`), and 1px row separators.
4. Service badges and the `+N More` counter keep their existing click-through to `ServicesPopover`.
5. Status pills, payment amounts, and action icons remain aligned; key text uses `noWrap` to avoid unwanted wrapping.
6. Existing blue-and-white theme, search, status/service/time filters, status tabs, dynamic counts, and summary cards are preserved.

## 3. Responsive pagination alignment rules
| Viewport | Footer | Rows per page + range | Navigation controls |
| --- | --- | --- | --- |
| Mobile (`xs`, < 600px) | Wraps; `justify-content: flex-end`; 6px row gap | Size first (`order: 1`), range second (`order: 2`, `margin-left: auto`) | Full width (`order: 3`), right-aligned, single row, 6px gap |
| Laptop/desktop (`sm` and up, >= 600px) | Single non-wrapping row; `justify-content: flex-end`; 8px gap | Inline, vertically centered, no extra margins | Auto width, right-aligned, single row, 6px gap |

Additional rules for every breakpoint:
- Tooltip wrapper spans around the icon buttons are `inline-flex`, so no implicit gaps appear.
- Icon buttons have `margin: 0` and no reserved width; the group never uses numbered buttons or ellipsis placeholders.
- The range label is `white-space: nowrap` and never shrinks.
- The footer is always the last element of the table card and remains sticky at the bottom.

## 4. Verification
Run from the project root:
```
npm test
npm run typecheck
npm run build
```
All existing Orders V2 functionality tests plus the pagination, alignment, and styling criteria tests must pass.
