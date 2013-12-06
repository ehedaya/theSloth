theSloth
========

A chrome extension to relay data about songs played in http://plug.dj/thephish/.  This repository has evolved from being a [TurnTable](http://turntable.fm/) bot to a Chrome extension in response to the news that TurnTable is closing on December 2, 2013.

[Install from Chrome Webstore](http://bit.ly/theSlothExt)

## How it works

This extension is only active in http://plug.dj/thephish. You do not need to install this extension to have your stats logged. As long as there is at least one person in [the room](http://plug.dj/thephish), events for all users in the room will be translated by the extension into [XML HTTP requests](http://en.wikipedia.org/wiki/XMLHttpRequest) that get saved in a database.  These are used for the [statistics site](http://stats.thephish.fm).
