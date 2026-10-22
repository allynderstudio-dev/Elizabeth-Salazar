#!/usr/bin/env bash
# Guarda un secreto para desarrollo local FUERA del repositorio y del sitio público.
# Lo pide sin mostrarlo en pantalla ni dejarlo en el historial del shell.
#   bash tools/set-secret.sh CAL_API_KEY
#   bash tools/set-secret.sh CRON_SECRET --generate
# Destino: ~/.config/ely-reservas/env (permisos 600). Para producción usa `vercel env add` (ver README).
set -euo pipefail

name="${1:-}"
if [[ ! "$name" =~ ^[A-Z][A-Z0-9_]*$ ]]; then
  echo "Uso: bash tools/set-secret.sh NOMBRE_VARIABLE [--generate]" >&2
  exit 1
fi

dir="${ELY_SECRETS_DIR:-$HOME/.config/ely-reservas}"
file="$dir/env"
umask 077
mkdir -p "$dir"
touch "$file"
chmod 600 "$file"

if [[ "${2:-}" == "--generate" ]]; then
  value="$(openssl rand -hex 32)"
else
  read -r -s -p "Pega el valor de $name (no se mostrará) y pulsa Enter: " value
  echo
fi
if [[ -z "$value" ]]; then
  echo "Valor vacío: no se guardó nada." >&2
  exit 1
fi
if [[ "$name" == "CAL_API_KEY" && "$value" != cal_* ]]; then
  echo "Aviso: las claves de Cal.com empiezan por cal_. Revisa que copiaste la clave correcta." >&2
fi

tmp="$(mktemp "$dir/.env.XXXXXX")"
grep -v "^$name=" "$file" > "$tmp" || true
printf '%s=%s\n' "$name" "$value" >> "$tmp"
mv "$tmp" "$file"
chmod 600 "$file"
unset value
echo "$name guardado en $file (solo tu usuario puede leerlo)."
