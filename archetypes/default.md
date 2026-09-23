+++
date = '{{ replaceRE "T.*" "" .Date }}'
draft = true
title = '{{ replace (replace .File.ContentBaseName "-" " ") "_" " " | title }}'
categories = ['Thoughts']
tags = ['Writing']
summary = 'TODO: 1-2 sentence teaser shown on listing pages.'
+++

<!-- Draft stays local until Naren says ship. Preview with: make preview -->
