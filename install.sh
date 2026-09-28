#!/usr/bin/env bash
set -euo pipefail

usage() {
    echo "usage: install.sh --target claude|codex|agents [--project DIR] [--link]" >&2
    exit 2
}

target=''
project=''
link=0
while [ $# -gt 0 ]; do
    case "$1" in
        --target) [ $# -ge 2 ] || usage; target=$2; shift 2 ;;
        --project) [ $# -ge 2 ] || usage; project=$2; shift 2 ;;
        --link) link=1; shift ;;
        *) usage ;;
    esac
done

src="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/plugins/leo/skills"

case "$target" in
    claude) dest=${project:+$project/.claude/skills}; dest=${dest:-$HOME/.claude/skills} ;;
    codex) dest=${project:+$project/.agents/skills}; dest=${dest:-$HOME/.agents/skills} ;;
    agents)
        [ -n "$project" ] || { echo "--target agents needs --project DIR" >&2; exit 2; }
        dest=$project/.agents/skills
        ;;
    *) usage ;;
esac

mkdir -p "$dest"
for skill in "$src"/leo-*/; do
    name=$(basename "$skill")
    installed="$dest/$name"
    if [ -e "$installed" ] || [ -L "$installed" ]; then
        if ! grep -qx "name: $name" "$installed/SKILL.md" 2>/dev/null; then
            echo "refusing to replace $installed: not a $name install" >&2
            exit 1
        fi
        rm -rf "$installed"
    fi
    if [ "$link" -eq 1 ]; then
        ln -s "${skill%/}" "$installed"
    else
        cp -R "${skill%/}" "$installed"
    fi
    echo "installed $name -> $installed"
done
