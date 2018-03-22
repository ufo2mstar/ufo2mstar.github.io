:: cd ..\site\
:: read -p "Commit desc: " desc
:: git add . && \
:: git add -u && \
:: git commit -m "$desc" && \
:: git push origin source
@echo off
::echo Building project... &
::bundle exec jekyll build -d ..\site\ &
::echo Built locally... &
cd ..\site\ &
set /p msg="Please enter your site commit msg : "
:: echo %msg%

git add . &
git add -u &
git commit -m "POST: %msg%" &
echo push done! &
git push origin master &
echo ... &
echo site is live @ http://ufo2mstar.github.io/
cd ..\merger
