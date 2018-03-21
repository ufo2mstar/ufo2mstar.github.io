cd ..\site\
read -p "Commit desc: " desc
git add . && \
git add -u && \
git commit -m "$desc" && \
git push origin source
