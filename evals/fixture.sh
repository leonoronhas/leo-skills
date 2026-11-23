#!/usr/bin/env bash
# Seeds each eval run's empty workspace with a small repo, so a prompt about a file
# or a bug has something real to read and edit. Run by `claude plugin eval --scaffold`.
set -euo pipefail

mkdir -p src/utils docs/specs

cat > src/utils/price.js <<'JS'
// Cart pricing helpers.

/**
 * @param {{ price: string, quantity: number }[]} items
 * @returns {number} cart total in dollars
 */
export function cartTotal(items) {
    let total = 0

    for (const item of items) {
        total += parseFloat(item.cost) * item.quantity
    }

    return total
}
JS

cat > src/utils/text.js <<'JS'
export function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1)
}
JS

cat > docs/specs/bulk-import.md <<'MD'
# Bulk import

Admins upload a CSV of up to 10,000 contacts. Rows are validated, duplicates are
merged by email, and a summary lists created, merged, and rejected rows.
MD

git init -q
git add -A
git -c user.email=eval@example.com -c user.name=eval commit -qm 'initial commit'

echo "export const VERSION = '1.0.1'" > src/version.js
git add src/version.js
