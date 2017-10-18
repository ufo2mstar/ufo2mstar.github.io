---
layout: post
comments: true
title:  "Tips: Merging two separate Git Repos"
date: 2017-10-16
categories: [VCS]
tags: [Tips, Git, Tool, SVN]
excerpt: Had a fun problem to merge two of my projects in separate git repos. Here's how I did it.
mathjax: false
---
* content
{:toc}

# Please learn Git! ASAP..
Do check out my past post ([Primer: Gitting Started!]({{ site.base_url }}/blog/2017/08/19/primer_git/)) on where to get started with git.

# Now to merging Two Repos
Perhaps not an often faced problem, but it can be a little tricky.
So my use case was that I had a [remote repo](https://help.github.com/articles/about-remote-repositories/) that had some legacy code and I have the newer cut sitting on my local machine.
The nostalgic fellow that I am, I did not want to lose any history (which I will probably never revert to, but its good to see where we have come from)
Thus came the need for doing a git merge with a third merger repo :blush: and here are the steps

## Step 1: Init the Third repo locally
You may need to commit some file first to the **Third merger _git repo_** the repo started: I recommend the {.gitignore} file from your new repo.
```bash
git init ThirdRepo
cp UpgradedLocalRepo/.gitignore ThirdRepo/
cd ThirdRepo
git add .
git commit -m "INIT: the Final destination repo"
```
## Step 2: Add the old remote (legacy) and pull the content
```bash
git remote add RemoteRepo <LegacyRemoteURL>
git pull RemoteRepo
```
## Step 3: Merge with the Third repo
```bash
git merge RemoteRepo/master
git commit -m "OLD_MERGE: successfully imported the old repo trees"
``` 
## Step 4: *Handle* the old code and commit the changes
You may either get rid of unnecessary files or back them up in a different directory
```bash
git rm <all files you dont want>
git commit -m "HANDLED_STATE: taken care of the legacy code"
```
## Step 5: Now add the new local repo (upgrade) and pull the content (like Step 2)
```bash
git remote add LocalRepo ../UpgradedLocalRepo
git pull LocalRepo
```
## Step 6: Merge with the Third repo (like Step 3)
```bash
git merge LocalRepo/master
git commit -m "NEW_MERGE: successfully imported the new repo trees"
```
## Step 7: Finally, the push
Now that the histories from both the git repos are roots of the **Third merger repo**, make all the necessary changes to keep or delete the backed up data from the legacy repo here
And once we push our changes to the **remote**.. and _**Voila!**_ you have now married your old history to your new one.. and your third repo will continue happily ever after! :smile:
```bash
# once you are done with all your changes and the ThirdRepo is your final expected state, then
git push RemoteRepo
```

TODO: **_Screencaps will be added on request.. feel free to leave a comment below if you would like some_**

### Note:
Some of the [Stachoverflow posts](https://stackoverflow.com/questions/1425892/how-do-you-merge-two-git-repositories) I saw on the same were not addressing the exact problem statement I was trying to address.
Also, I came across a pretty good post by [Eric Lee](https://saintgimp.org/2013/01/22/merging-two-git-repositories-into-one-repository-without-losing-file-history/) on the same.
