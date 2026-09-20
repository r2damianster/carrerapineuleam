#!/bin/bash
# vercel-ignore-build.sh
# Vercel ejecuta este script ANTES de buildear.
# exit 0 = NO deployar (skip)
# exit 1 = SÍ deployar (build)

echo "🔍 Checking if build is needed..."

COMMIT_MSG=$(git log -1 --format="%s")

# Commit que solo toca markdown o docs/ no cambia el runtime: no generar deployment.
# Cada deployment de este proyecto crea ~300 funciones serverless (cuota de Functions Storage).
DOC_CHANGED=$(git diff HEAD~1 --name-only 2>/dev/null || echo "")
if [ -n "$DOC_CHANGED" ]; then
  NON_DOC_CHANGES=$(echo "$DOC_CHANGED" | grep -vE '(\.md$|^docs/)' || true)
  if [ -z "$NON_DOC_CHANGES" ]; then
    echo "⏭ Skipping: commit solo con documentación (.md / docs/)"
    exit 0
  fi
fi

# Si es un auto-commit sin archivos listados, probablemente es trivial
if [[ "$COMMIT_MSG" == "chore: auto-commit —" ]]; then
  # Verificar si hubo cambios reales en código
  CHANGED=$(git diff HEAD~1 --name-only 2>/dev/null || echo "")

  if [ -z "$CHANGED" ]; then
    echo "⏭ Skipping: auto-commit vacío, sin cambios"
    exit 0
  fi

  # Si solo cambiaron docs/markdown/imágenes, no vale la pena buildear
  CODE_CHANGES=$(echo "$CHANGED" | grep -cE '\.(ts|tsx|js|jsx|json|css|prisma)$' || true)

  if [ "$CODE_CHANGES" -eq 0 ]; then
    echo "⏭ Skipping: auto-commit solo con docs/assets, sin código"
    exit 0
  fi

  echo "✅ Building: auto-commit con $CODE_CHANGES archivos de código modificados"
  exit 1
fi

# Para cualquier otro mensaje de commit, siempre buildear
echo "✅ Building: commit manual detectado"
exit 1
