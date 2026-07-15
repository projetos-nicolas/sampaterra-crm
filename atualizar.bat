@echo off
cd /d "%~dp0"
echo Rodando prisma db push...
npx prisma db push --accept-data-loss
echo.
echo Commitando e fazendo push...
git add -A
git commit -m "feat: operador em manutencao/locacao, preventivas, disponibilidade, mascaras CPF/CNPJ/tel, unidades caminhoes/diaria, remover tipos de servico"
git push origin master:main
echo.
echo Concluido!
pause
