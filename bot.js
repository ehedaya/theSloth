var Bot    	= require('ttapi');
var http   	= require('http-get');
var dp = require('./date.js');
var settings = require('./bot.settings.js');
var usersList = { };

var bot = new Bot(AUTH, USERID, ROOMID);
bot.debug = false;

function parseDate(i) {
	var r = /[0-9]{1,4}[\-\/\s\.\\]{1,2}[0-9]{1,2}[\-\/\s\.\\]{1,2}[0-9]{1,4}/;
	var showdate = i.match(r); 
	if (showdate) {
		var d = Date.parse(showdate[0]);
		if (d) {
			var d2 = d.toString('yyyy-MM-dd');
			return d2;
		} else {
			return false;
		}
	}  else {
		return false;
	}
}

function randomItem(j) {
	var randno = Math.floor(Math.random()*j.length);
	return j[randno];
}

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}

function getGuid() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}

function myLog(type, message) {
	var d = new Date();
	console.log('['+d.toString('yyyy-MM-dd HH:mm:ss')+'] ['+type+'] '+message);
}

function getEpoch() {
	var epoch = parseInt((new Date).getTime()/1000);
	return epoch;
}

function pause(millis) {
	var date = new Date();
	var curDate = null;
	do { curDate = new Date(); } 
	while(curDate-date < millis)
}

bot.on('newsong', function(data) { 
	var dateBlob = data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album;
	var songname = 	data.room.metadata.current_song.metadata.song, 
		artist = 	escape(data.room.metadata.current_song.metadata.artist),
		songid = 	escape(data.room.metadata.current_song._id),
		starttime = escape(data.room.metadata.current_song.starttime),
		album = 	escape(data.room.metadata.current_song.metadata.album),
		song = 		escape(data.room.metadata.current_song.metadata.song),
		tracktime = escape(data.room.metadata.current_song.metadata.length),
		userid = 	escape(data.room.metadata.current_dj);
	awesomes.length = 0;
	if (mode.cantDj) { myLog('newsong', 'mode.cantDj value is '+mode.cantDj); }
	var showdate = parseDate(dateBlob);
	var lastPlayedResponse = '';

	if (mode.type) {
		if (!mode[userid]) { mode[userid] = 0; }
		if (mode.type=='timed' && (mode[userid]+tracktime>=mode.maxTime)) {
			bot.speak('/me reloads rifle');
			myLog('newSong', 'Pending autoboot for '+userid+' accumulated '+mode[userid]+', limit is '+mode.maxTime);
			modeBootPending = true;
		} else if (mode.type=='playN' && (mode[userid]+1>=mode.maxPlays)) {
			bot.speak('/me reloads rifle');
			modeBootPending = true;
			myLog('newSong', 'Pending autoboot for '+userid+' accumulated '+mode[userid]+', limit is '+mode.maxPlays);
		} else if (mode.type == 'speed') {
			if (tracktime > mode.maxTime) {
				pause(1000);
				bot.remDj(userid);
				var minutes = mode.maxTime/60;
				bot.pm('DJs must play songs under '+minutes+mode.maxUnits+' to stay on the stage. Read more: http://thephish.fm/modes/', userid);
				bot.speak('DJs must play songs under '+minutes+mode.maxUnits+' to stay on the stage. Read more: http://thephish.fm/modes/');
				myLog('newsong', 'Track length is '+tracktime+', above cap of '+mode.maxTime);
			} else {
				myLog('newsong', 'Track length is '+tracktime+', beneath cap of '+mode.maxTime);
			}
		} else {
			myLog('newSong', "Mode is set but user will not be over limits.");
		}
	}
});
bot.on('roomChanged',  function (data) {
  usersList = { };
  for (var i=0; i<data.users.length; i++) {
    var user = data.users[i];
    user.lastActivity = Date.now();
    usersList[user.userid] = user;
  }
});

bot.on('endsong', function(data) {
			myLog('endsong', 'djcount was '+data.room.metadata.djcount);
	var upvotes = data.room.metadata.upvotes,
		listeners = data.room.metadata.listeners,
		starttime = data.room.metadata.current_song.starttime,
		userid = 	escape(data.room.metadata.current_dj),
		tracktime = escape(data.room.metadata.current_song.metadata.length),
		name = data.room.metadata.current_song.djname;
		mode.cantDj = null;
	if(mode.type) {
		if (!mode[userid]) { mode[userid] = 0;  }
		if(mode.type == 'playN') {
			mode[userid] = mode[userid] ? mode[userid]+1 : 1;
			myLog('endSong', name+' has '+mode[userid]+' plays');
			if (mode[userid] >= mode.maxPlays) {
				bot.speak('/me fires a single shot');
				bot.remDj(userid);
				mode.cantDj = userid;
				mode.cantDjExpires = getEpoch()+30;
				myLog('endsong', 'Setting mode.cantDj to '+userid);
				modeBootPending = false;
				mode[userid] = 0;
				bot.pm(name+', we\'re asking DJs to give others a chance at a DJ spot after '+mode.maxPlays+mode.maxUnits+'. If nobody else wants to DJ, hop back up!', userid);
			}
		} else if (mode.type == 'timed') {
			mode[userid] = mode[userid] ? mode[userid]+parseInt(tracktime) : parseInt(tracktime);
			myLog('endSong', name+' has played '+mode[userid]/60+' minutes');
			if (mode[userid] >= mode.maxTime) {
				bot.speak('/me fires a single shot');
				bot.remDj(userid);
				myLog('Setting mode.cantDj to '+userid);
				mode.cantDj = userid;
				mode.cantDjExpires = getEpoch()+30;
				modeBootPending = false;
				mode[userid] = 0;
				bot.pm(name+', we\'re asking DJs to give others a chance at a DJ spot after '+mode.maxTime/60+mode.maxUnits+'. If nobody else wants to DJ, hop back up!', userid);
			}
		} 
	}	
	if (djspot['mode'] == 'reservation') {
		bot.remDj();
		myLog('endSong', djspot['reserved_for']+' expired, quitting DJ spot');
		djspot['mode'] = djspot['on_stage'] = djspot['reserved_for'] = false;
		bot.speak('Spot!');
	} else if (djspot['mode'] == 'dj') {
		djspot['count']++;
		myLog('endsong', 'DJ turns: '+djspot['count']);
		if ((djspot['count'] >= 3) || (data.room.metadata.djcount > 2)) {
			myLog('endsong', 'djcount was '+data.room.metadata.djcount);
			djspot['mode'] = djspot['count'] = djspot['on_stage'] = false;
			bot.speak(randomItem(['That was fun.', 'Whew, I\'m beat.', 'Let me know if you need more DJ help.']));
			bot.remDj();
		}
	}
	if (lastsong) {
		myLog('endSong', 'Booting '+lastsong+' via !lastsong');
		bot.speak('/me fires a single shot.');
		bot.remDj(lastsong);
		lastsong = false;
	}
});

bot.on('new_moderator', function (data) {
 });

bot.on('add_dj', function(data) {
	var new_dj_id = data.user[0].userid;
	var new_dj_name = data.user[0].name;
	var new_dj_avatar_id = data.user[0].avatarid;
	var options = { url: apibase+'user.php?key='+apikey+'&id='+new_dj_id+'&name='+new_dj_name+'&avatarid='+new_dj_avatar_id };
	http.get(options, function(error, res) {
		if (error) {
			myLog('addDj','bot.on(add_dj) - Error connecting to '+options['url']);
		} else {
			var status = res.buffer;
			if (status == 'new' && new_dj_id != selfUserid) {
				bot.pm('Hey '+new_dj_name+', welcome to thePhish! Please read this before playing your first track - http://thephish.fm/tips', new_dj_id);
				myLog('addDj', 'Sent welcome message to  '+new_dj_name);
			}
		}
	});
	if (mode.cantDj) {
		var expirationCheck = getEpoch();
		if ((new_dj_id == mode.cantDj) && (expirationCheck < mode.cantDjExpires)) {
			var secondsLeft = mode.cantDjExpires - expirationCheck;
			var secondsLeftUnits = secondsLeft == 1 ? 'second' : 'seconds';
			bot.remDj(mode.cantDj);
			bot.pm('Hey now, '+new_dj_name+', let\'s see if anyone else wants to DJ. Wait '+secondsLeft+' '+secondsLeftUnits+', and if nobody else has claimed the spot, it\'s all yours.', new_dj_id);
			bot.speak('@'+new_dj_name+' wait.');
			myLog('addDj', mode.cantDj+' yanked off the stage, easy, tiger, just '+secondsLeft+' '+secondsLeftUnits+' left.');
		}
	}
	if(djspot['on_stage'] && new_dj_id != USERID) {
		var roominfo = bot.roomInfo(true, function(data) {
			if (djspot['mode'] == 'dj' && data.room.metadata.djcount > 2) {
				djspot['mode'] = false;
				djspot['count'] = false;
				djspot['on_stage'] = false;
				bot.speak('Looks like you\'ve got enough DJs now.');
				bot.remDj();
			}			
		});
	}
});

bot.on('rem_dj', function(data) {
	if ((djspot['mode'] == 'reservation') && (djspot['reservedfor'] == data.userid)) {
		myLog('remDj', 'Holding spot for '+data.userid);
		bot.addDj();
		bot.vote('up');
		bot.speak('/me waves to the crowd.');
		djspot['on_stage'] = true;
	}
});
bot.on('update_votes', function (data) {
  var votelog = data.room.metadata.votelog;
  for (var i=0; i<votelog.length; i++) {
    var userid = votelog[i][0];
  }
});


bot.on('speak', function (data) {
   var name = data.name;
   var text = data.text;
   var userid = data.userid;
   var setlist = null;
      
   if (text.match(/^!help$/i)) {
	   	bot.speak('http://stats.thephish.fm/about.php');
   }
   if (text.match(/glares.+thesloth/i)) {
   		bot.speak('/me glares at '+name);
   }
   if (text.match(/^!tips$/i)) {
   		bot.speak('http://thephish.fm/tips/ ');
   }
   if (text.match(/^!stream$/i)) {
   		bot.speak('http://mobilefunspot.com/streams.html');
   }
   if (text.match(/^!stats$/i)) {
   		bot.speak('http://stats.thephish.fm/');
   }
   if (text.match(/^!gifs$/i)) {
   		bot.speak('http://tinyurl.com/ttgifs');
   }
   if (text.match(/^!deg$/i)) {
   		bot.speak('http://tinyurl.com/phishdeg');
   }
   if (text.match(/^!greet$/i) && greeting.length>1) {
   		bot.speak(greeting);
   }
   if (text.match(/^!slide$/i)) {
   		bot.speak('http://thephish.fm/theslide');
   }
   if (text.match(/^!sloth$/i) || text.match(/^!about$/i)) {
   		bot.speak('http://stats.thephish.fm/about.php');
   }
   if (text.match(/^!skip$/i)) {
   		bot.skip();
   }
   if (text.match(/^!meettup$/i)) {
   		bot.speak('http://www.tinyurl.com/2012TTNYE');
   }
   if (text.match(/^!ss$/i)) {
                bot.speak('http://thephish.fm/secreTTsanTTa');
   }
   if (text.match(/^!whatdidkfhaveforbreakfast$/i)) {
   		bot.speak('Trick question.  KernelForbin did not eat breakfast.');
   }
   if (text.match(/^!ttplus$/i)) {
        bot.speak('TT+ info: http://turntableplus.fm/beta');
   }
   if (text.match(/^!ttx$/i)) {
   		bot.speak('Turntable X: http://bit.ly/WbRp8P');
   }
   if (text.match(/^[!+](add(me)?|list|q|qa)$/i)) {
   		bot.speak('K '+name+', you\'re on "the list!"');
   }
   if (text.match(/^!notes$/i)) {
		bot.roomInfo(true, function(data) {
			var starttime = Math.floor(data.room.metadata.current_song.starttime);
	   		bot.speak('Prefix notes with ## and I\'ll save them for later. For example: http://stats.thephish.fm/'+starttime);		
		});

   }
   if (text.match(/^!who$/i)) {
   		var usersHere = '';
   		for(var u in usersList) {
   			usersHere+=u.substring(0,11)+',';
   		}
   		if(usersHere.length>10) {
			bot.roomInfo(true, function(data) {
				if (showdate = parseDate(data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album)) {
					var options = {url: apibase+'getUsersAtShow.php?key='+apikey+'&date='+showdate+'&u='+usersHere };
					http.get(options, function(error, res) {
						if (error) {
							myLog('speak', '!who - Error connecting to '+options['url']);
						} else {
							var who = res.buffer;
							if (who.length > 1) {
								bot.speak(who);
							} 
						}
					});
				} else {
					bot.speak('I don\'t know the showdate.');
				}
			});
   		}
   }

	if (text.match(/^!last$/i)) {
		if (lastPlayedResponse.length>1) {
			bot.speak(lastPlayedResponse);
			myLog('speak', '!last - Used cache');
		} else {
			bot.roomInfo(true, function(data) {
				if (showdate = parseDate(data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album)) {
					var options = {url: apibase+'lastPlayed.php?showdate='+showdate+'&starttime='+data.room.metadata.current_song.starttime };
					http.get(options, function(error, res) {
						if (error) {
							myLog('speak', '!last - Error connecting to '+options['url']);
						} else {
							var lastPlayedResponse = res.buffer;
							if (lastPlayedResponse.length > 1) {
								bot.speak(lastPlayedResponse);
							} 
						}
					});
				} else {
					bot.speak('I don\'t know the showdate.');
				}
			});
		}
	}
	if (text.match(/^##/i)) {
		var note = escape(text.substr(2));		
		bot.roomInfo(true, function(data) {
			if (showdate = parseDate(data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album)) {
				var options = {url: apibase+'note.php?userid='+userid+'&starttime='+data.room.metadata.current_song.starttime+'&visibility=public&content='+note };
				http.get(options, function(error, res) {
					if (error) {
						myLog('speak', '## note - Error connecting to '+options['url']);
					} else {
						var noteResponse = res.buffer;
						if (noteResponse == "success") {
							myLog('speak', '## note - Stored note.');
						} else if (noteResponse == "not found") {
							bot.pm('This song didn\'t get logged in stats', userid);
							myLog('speak', '## note - Failed note, could not find song.');
						} else {
							myLog('speak', '## note - Failed note, fell out of if-block.');
							bot.pm('Hm, something went wrong.', userid);
						}
					}
				});
			} else {
				bot.speak('I can\'t note this without the showdate.');
			}
		});
	}

   	   if (text.match(/^!replay$/i)) {
   	   	if (replayOverride) {
   	   		bot.speak(replayInfo);
   	   	} else {
			var options = { url: apibase+'thephish.php?type=replay' };
			http.get(options, function(error, res) {
				if (error) {
					myLog('speak', '!replay - Error connecting to '+options['url']);
				} else {
					var replayInfo = res.buffer;
					if (replayInfo.length > 1) {
						bot.speak(replayInfo);
					} else {
						bot.speak("No replay today :( http://thephish.fm/replays");
					}
				}
			});
		}
	}
	if (text.match(/^!groove$/i)) {
		var options = {url: apibase+'groove.php' };
		http.get(options, function(error, res) {
			if (error) {
				myLog('speak', '!groove - Error connecting to '+options['url']);
			} else {
				var groove = res.buffer;
				if (groove.length > 1) {
					bot.speak(groove);
				} 
			}
		});
	}
	if (text.match(/^!points:/i)) {
		var points = escape(text.substr(8));		
		var options = {url: apibase+'points.php?userid='+userid+'&target='+points };
		http.get(options, function(error, res) {
			if (error) {
				myLog('speak', '!points - Error connecting to '+options['url']);
			} else {
				var who = res.buffer;
				if (who.length > 1) {
					bot.speak(who);
				} 
			}
		});
	}
    if (text.match(/^!album$/)) {	 
   		bot.roomInfo(true, function(data) {
			if ((data.room.metadata.current_song.metadata.album).length > 1) {
				bot.speak('Album field: '+data.room.metadata.current_song.metadata.album);
			} else {
				bot.speak('The album field is blank.');
			}
   		});
   	}
   if (text.match(/^!dj$/i)) {
   	bot.roomInfo(true, function(data) {
   		if (data.room.metadata.djcount == 1 && !djspot['mode']) {
    			djspot['on_stage'] = true;
    			djspot['mode'] = 'dj';
    			djspot['count'] = 0;
    			bot.addDj();
   		} else if (data.room.metadata.djcount > 1 && !djspot['mode']) {
   			bot.speak('Sorry, I am only allowed to DJ with one other person.');
   		} else if (djspot['mode']) {
   			bot.speak('Sorry, I\'m not available to be a right now.');
   		} else if (data.room.metadata.djcount < 1 && !djspot['mode']) {
   			bot.speak(randomItem(['You first!', 'After you!', 'I insist, go ahead.', 'Only if you do.']));
   		} else {
   			bot.speak('Egg freckles.');
   			myLog('!dj', 'Fell out of if() block when asked to DJ');
   		}
   	});
   }
   if (text.match(/^!quit$/i)) {
   	   if (djspot['mode'] == 'dj') {
   	   		djspot['on_stage'] = djspot['mode'] = djspot['count'] = djspot['reservedfor'] = false;
   	   		bot.remDj();
   	   } else if (moderators.contains(userid)) {
   	   		djspot['on_stage'] = djspot['mode'] = djspot['count'] = djspot['reservedfor'] = false;
   	   		bot.remDj();
   	   }
   }   
   if (text.match(/(awesome|great|sick|nasty|good|nice)/i)) {
		if (!awesomes.contains(userid)) {
			awesomes.push(userid);
		}
   		if (awesomes.length >= 3) {
   			bot.vote('up');
   		}
   }
   if (text.match(/(sloth)/i)) {
		myLog('speak','@mention: '+name+' - '+text);
   }

   if (text.match(/(hate|shut up|quiet|lame|fu).+thesloth/i)) {
		bot.speak(randomItem(['/me glares at '+name, 'T_T', '>.<']));
		bot.removeFan(userid);
   }
	   if (text.match(/love.+sloth/i)) {
		bot.speak(randomItem(['I love you too, '+name+'', 'The feeling is mutual.', 'Awwwww....']));
		bot.becomeFan(userid);
   }
   if (text.match(/feed.+sloth/i)) {
	   	bot.speak(randomItem(['ITALIAN SPAGHETTI!','*omnomnom*', '/me burps']));
   }
   if (text.match(/(pets|hugs).+sloth/i)) {
  	 	bot.speak(randomItem(['http://tinyurl.com/slothishappy', '<3', 'http://tinyurl.com/coolsloth']));
   }
   if (text.match(/(lick|spam|dose).+sloth/i)) {
	   	bot.speak('/me stabs '+name);
   }
   if (text.match(/dances with.+sloth/i)) {
   		bot.speak('/me dances with '+name);
   }
   
   if (text.match(/^\!setlist$/)) {	 
   		bot.roomInfo(true, function(data) {
   			if (showdate = parseDate(data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album)) {
   				bot.speak('http://phish.net/setlists/?d='+showdate);
   			} else {
				bot.speak('I couldn\'t find a date in any fields: '+data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album);
			}
   		});
   }

	if (text.match(/^!live$/)) {
   		bot.roomInfo(true, function(data) { 
			var options = { url: 'http://api.phish.net/api.js?api=1.0&method=getShow&apikey='+PNPK+'&linked=0&format=json&showdate=2015-06-06' };
			http.get(options, function(error, res) {
					if (error) {
						var d = new Date();
						myLog('pmmed', '!setlisfull - Error connecting to '+options['url']);
						bot.speak('Oops, something went wrong.');
					} else {
					   var d = res.buffer;
						  var json = JSON.parse(d);
						  var setlistdata = json[0].setlistdata;
						  var setlist = setlistdata.replace(/(<([^>]+)>)/ig,"");
						  bot.speak(setlist);
						myLog('pmmed', '!setlisfull - Retrieved setlist successfully');
					}
				});
   		});
   }
   
   
   
   
	   
});

bot.on('update_user', function (data) {
 });

bot.on('registered', function(data) {
	var name = escape(data.user[0].name);
	var name2 = data.user[0].name;
	var userid = escape(data.user[0].userid);
	var avatarid = data.user[0].avatarid;
	var points = data.user[0].points;

	var user = data.user[0];
	usersList[user.userid] = user;

	
	
	var options = { url: apibase+'user.php?key='+apikey+'&id='+userid+'&name='+name+'&avatarid='+avatarid+'&points='+points };
	if (blacklist.contains(userid)) {
		bot.bootUser(userid, randomItem(blacklistReasons));
		return;
	} else {
		http.get(options, function(error, res) {
			if (error) {
				myLog('registered', 'Not on cached blacklist, checking database, error connecting to '+options['url']);
			} else {
				var status = res.buffer;
				if (status == 'banned') {
					bot.bootUser(userid, randomItem(blacklistReasons));
					blacklist.push(userid);
					myLog('registered', 'Booted blacklisted user '+userid);
					return;
				} 
			}
		});
		if (replayOverride) {
			bot.pm(replayInfo, userid);
		} else {
			var options = { url: apibase+'thephish.php?type=replay' };
			http.get(options, function(error, res) {
				if (error) {
					myLog('registered', 'Retrieving replay info, error connecting to '+options['url']);
				} else {
					var replayInfo = res.buffer;
					if (replayInfo.length > 1) {
						bot.pm(replayInfo, userid);
					} 
				}
			});
		}

		var roominfo = bot.roomInfo(true, function(data) {
			moderators = data.room.metadata.moderator_id;
		});		

		if (userid == djspot['reserved_for']) {
			bot.pm('Remember, reply with !spot when you are ready to take your spot back.', userid);
		}
		if (greeting) {
			bot.pm(greeting, userid);
		}
		if (mode.type) {
			if (mode.type == 'playN') {
				bot.pm('DJs will now be removed after playing '+mode.maxPlays+mode.maxUnits+'.  Read more: http://thephish.fm/modes/', userid);
			} else if (mode.type == 'timed') {
				bot.pm('DJs will now be removed after playing '+mode.maxTime/60+mode.maxUnits+' of tracks. Read more: http://stats.thephish.fm/about.php#modes', userid);
			}		
		}
	}
});

bot.on('deregistered', function(data) {
  delete usersList[data.user[0].userid];
});

bot.on('pmmed', function (data) { 
	var roominfo = bot.roomInfo(true, function(data) {
		moderators = data.room.metadata.moderator_id;
	});
	var senderid = data.senderid;
	var userid = data.userid;
	var text = data.text;
	bot.getProfile(senderid, function(profile) { 
		var name = profile.name;
		myLog('pmmed', name+': '+text);
	});
	if (text.match(/^!help$/)) {
		if (admins.contains(senderid)) {
			bot.pm('Admin-only functions: !blacklist:username, !greet:greeting. Other commands: !setlistfull, !setlist, !album. http://stats.thephish.fm/about.php for all commands.', senderid);
	   	} else { 
			bot.pm('Available commands: !setlistfull, !lastsong, !setlist, !album. http://stats.thephish.fm/about.php for all commands.', senderid);
		}
	}	
	if (text.match(/^!setlistfull$/)) {
   		bot.roomInfo(true, function(data) { 
   			var dateblob = data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album;
			if (showdate = parseDate(dateblob)) {
				var options = { url: 'http://api.phish.net/api.js?api=1.0&method=getShow&apikey='+PNPK+'&linked=0&format=json&showdate='+showdate };
				http.get(options, function(error, res) {
						if (error) {
							var d = new Date();
							myLog('pmmed', '!setlisfull - Error connecting to '+options['url']);
						} else {
						   var d = res.buffer;
							  var json = JSON.parse(d);
							  var setlistdata = json[0].setlistdata;
							  var setlist = setlistdata.replace(/(<([^>]+)>)/ig,"");
							  bot.pm(setlist, senderid);
							myLog('pmmed', '!setlisfull - Retrieved setlist successfully');
						}
					});
			} else {
				bot.pm('I couldn\'t find a date in any fields: '+data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album, senderid);
			}
   		});
   }
    if (text.match(/^!setlist$/)) {	 
   		bot.roomInfo(true, function(data) {
   			if (showdate = parseDate(data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album)) {
   				bot.pm('http://phish.net/setlists/?d='+showdate, senderid);
   			} else {
				bot.pm(randomItem(['I can\'t parse the date. I blame Team Reba', 'Maybe if the DJ tagged their tracks a little better...', 'No dice, sorry.']), senderid);
			}
   		});
   	}
    if (text.match(/^!album$/)) {	 
   		bot.roomInfo(true, function(data) {
			if ((data.room.metadata.current_song.metadata.album).length > 1) {
				bot.pm(data.room.metadata.current_song.metadata.album, senderid);
			} else {
				bot.pm('The album field is blank.', senderid);
			}
   		});
   	}
    if (text.match(/^!dateblob$/)) {	 
   		bot.roomInfo(true, function(data) {
			bot.pm(data.room.metadata.current_song.metadata.artist+data.room.metadata.current_song.metadata.song+data.room.metadata.current_song.metadata.album, senderid);
   		});
   	}
   	if (senderid == '4e711b314fe7d045b011f114') {
   		if (text.match(/^\>/)) {
   			myLog('pmmed', 'Puppetry - '+text.substr(1));
   			bot.speak(text.substr(1));
   		}
   	}
   	if (text.match(/(awesome|great|sick|nasty|good)/i)) {
		if (!awesomes.contains(senderid)) {
			awesomes.push(senderid);
		}
   		if ((awesomes.length) >= 3) {
   			bot.vote('up');
   		}
   	}
   	
   	
   	if (text.match(/^!connect$/i)) {
   		var token = getGuid();
		var options = { url: apibase+'key.php?key='+apikey+'&id='+senderid+'&token='+token };
		http.get(options, function(error, res) {
			bot.pm('Psst, do not share this link with anyone: '+apibase+'auth.php?id='+senderid+'&token='+token, senderid);
			myLog('pmmed', '!connect key sent to - '+senderid);
		});
   	}
   	   	
   	
   	if (text.match(/^!spot$/i)) {
   		if (!djspot['mode']) {
   			var roominfo = bot.roomInfo(false, function(data) {
   				var djs = data.room.metadata.djs;
				if (djs.indexOf(senderid) == -1) { 
					bot.pm("You are not currently holding a DJ spot", senderid);
					myLog('pmmed', '!spot reply - You are not currently holding a DJ spot');
				} else { 
					bot.pm('PM me !spot when you are ready to take your spot back or if you change your mind to release the hold. I will automatically release it when this song ends, though, so hurry!', senderid);
					djspot['reserved_for'] = senderid;
					djspot['mode'] = 'reservation'; 
					myLog('pmmed', '!spot - Holding spot for ('+senderid+')');
				}
			});
   		} else {
   			if (djspot['reserved_for'] == senderid) {
   				if (djspot['on_stage']) {
					myLog('pmmed', '!spot - Reclaimed '+djspot['reserved_for']+' ('+djspot['reserved_for']+') by '+senderid);
					bot.remDj();
					djspot['reserved_for'] = false;
					djspot['on_stage'] = false; 
					djspot['mode'] = false;
				} else {
					myLog('pmmed', '!spot - Canceled hold for '+djspot['reserved_for']+' by '+senderid);
					bot.pm('OK, I\'ve canceled the hold on your spot.', senderid);
					djspot['reserved_for'] = false;
					djspot['mode'] = false;
				}
			} else {
				bot.pm('Sorry, I\'m holding a spot for someone else right now. Try later!', senderid);
			}
		}
   	}
   if (text.match(/^!lastsong$/i)) {
   		var roominfo = bot.roomInfo(false, function(data) {
   			myLog('pmmed', '!lastsong request by '+senderid);
			var cdj = data.room.metadata.current_dj;
			if (cdj == senderid) {
				if (!lastsong && !modeBootPending) {
					lastsong = senderid;
					myLog('pmmed', '!lastsong - Pending autoboot for '+lastsong);
					bot.pm('As you wish.', senderid);
					bot.speak('/me attaches scope to rifle.');
				} else if (cdj == senderid && modeBootPending) {
					bot.pm('Sorry sir, I have my orders.', senderid);
				} else {
					myLog('pmmed', '!lastsong - Pending autoboot for '+lastsong+' canceled');
					lastsong = false;
					bot.pm('*sigh*', senderid);
					bot.speak('/me puts his rifle away.');
				}			
			} else if ((cdj!=senderid)&&(moderators.contains(senderid))){
				if (!lastsong && !modeBootPending) {
					lastsong = cdj;
					myLog('pmmed', '!lastsong - Pending autoboot issued by '+senderid+' for '+cdj);
					bot.pm('As you wish.', senderid);
					bot.speak('/me attaches scope to rifle.');
				} else if (lastsong && !modeBootPending) {
					myLog('pmmed', '!lastsong - Pending autoboot for '+lastsong+' canceled by '+senderid);
					lastsong = false;
					bot.pm('*sigh*', senderid);
					bot.speak('/me puts his rifle away.');
				}
			} else {
				bot.pm('You must be the active DJ to use this feature.', senderid);
				myLog('pmmed', '!lastsong requested by non-DJ, rejected');
			}
		});
   }  
   if (text.match(/^!greet:/i)) {
   		if (admins.contains(senderid) || moderators.contains(senderid)) {
	   		greeting = text.substr(7);
   			if (greeting.length > 1) {
   				bot.pm('Here is the message I will PM to people who enter the room: '+greeting, senderid);
   				myLog('pmmed', '!greet - Greeting initiated by '+senderid+' - "'+greeting+'"');
   			} else {
   				greeting = false;
   				bot.pm('I won\'t greet people by PM anymore', senderid);
   				myLog('pmmed', '!greet - Greeting disabled by '+senderid);
   			}
   		} else {
   				myLog('pmmed', '!greet - Greeting request by non moderator '+senderid);
   		}
   }
   if (text.match(/^!replay:/i)) {
		if (admins.contains(senderid) || moderators.contains(senderid)) {
			replayInfo = text.substr(8);
			if (replayInfo.length > 1) {
				replayOverride = true;
   				bot.pm('Here is the new replay info greeting: '+replayInfo, senderid);
   				myLog('pmmed', '!replay override: '+replayInfo);
			} else {
				replayOverride = false;
				replayInfo = false;
				bot.pm('Replay override disabled.', senderid);
				myLog('pmmed', '!replay override canceled by '+senderid);
			}
		} else {
			myLog('pmmed', '!greet - Not authorized');
		} 
   }
   if (text.match(/^!blacklist:/i)) {
   		if (admins.contains(senderid)) {
			var badusername = escape(text.substr(11));
			var options = { url: apibase+'ban.php?key='+apikey+'&name='+badusername };
			myLog('pmmed', '!blacklist - Looking up user '+badusername+' with '+options['url']+'');
			http.get(options, function(error, res) {
					if (error) {
						var d = new Date();
							myLog('pmmed', '!blacklist - Error connecting to '+options['url']);
					} else {
						var result = res.buffer;
						if (result.match(/[a-z0-9]{24}/i)) {
							if (moderators.contains(result)) {
								myLog('pmmed', '!blacklist - Cannot blacklist moderator '+badusername);
								bot.pm('Sorry, I can\'t blacklist a moderator.  You must first remove moderator status.', senderid);
							} else {
								bot.bootUser(result, randomItem(blacklistReasons));
								myLog('pmmed', '!blacklist - Booting user '+result);
								bot.pm(badusername+' is now on the blacklist.  Visit http://stats.thephish.fm/banned.php after using !connect to undo this.', senderid);
							}
						} else {
							if (result == "duplicate") {
								bot.pm("User was already banned.", senderid);
								myLog('pmmed', '!blacklist - User was already banned: '+badusername);
							} else if (result == "not found") {
								bot.pm("Cannot find user "+badusername, senderid);
								myLog('pmmed', '!blacklist - User not found: '+badusername);
							} else {
								bot.pm("Something went wrong. Tell Emil!", senderid);
								myLog('pmmed', '!blacklist - Fatal error looking up: '+badusername);
							}	
						}
					}
			});
		}
   }
	if (text.match(/^!lame/i)) { 
		if (moderators.contains(senderid) || admins.contains(senderid)) {
			myLog('pmmed', '!lame - Downvote issued by '+senderid);
			bot.vote('down');
		} else {
			myLog('pmmed', '!lame - Denied non-admin / non-moderator');
			
		}
	}
	if (text.match(/^!awesome/i)) {
		var d = new Date(); 
		if (moderators.contains(senderid) || admins.contains(senderid)) {
			myLog('pmmed', '!awesome - Upvote issued by '+senderid);
			bot.vote('up');
		} else {
			myLog('pmmed', '!awesome - Not authorized');	
		}
	}	
   if (text.match(/^!last /i)) {
		var songname = escape(text.substr(6));
		var options = { url: apibase+'hpb.php?action=lastPlayed&song='+songname };
		http.get(options, function(error, res) {
			if (error) {
				myLog('pmmed', '!last [song] - Error connecting to '+options['url']);
			} else {
				var result = res.buffer;
				if (result.length > 1) {
					bot.pm(result, senderid);
				} else {
					bot.pm("I do not understand.", senderid);
				}
			}
		});
	}
	
    if (text.match(/^!weather/)) {	 
		var zip = escape(text.substr(9));
		var options = { url: apibase+'weather.php?key='+apikey+'&what=all&zip='+zip };
		http.get(options, function(error, res) {
			if (error) {
				myLog('pmmed', '!weather - Error connecting to '+options['url']);
			} else {
				var weather = res.buffer;
				if (weather.substr(0,15) == 'Conditions in ,') {
					bot.pm("There is no weather today.", senderid);
				} else {
					bot.pm(weather, senderid);
					myLog('pmmed', '!weather reply - '+weather);
				}
			}
		});
   	}
    if (text.match(/^!whois:/)) {	 
   		var whoisName = escape(text.substr(7));
		var options = { url: apibase+'whois.php?name='+whoisName };
		http.get(options, function(error, res) {
			if (error) {
				myLog('pmmed', '!whois - Error connecting to '+options['url']);
			} else {
				var whoisResult = res.buffer;
				bot.pm(whoisResult, senderid);
			}
		});
   		
   	}
	if (text.match(/^!mode:/) && (moderators.contains(senderid)||admins.contains(senderid))) {
		mode = null;
		mode = new Object();
		var newMode = text.substr(6);
		if (!newMode) {
			mode = new Object();
			modeBootPending = false;
			bot.speak('DJ limits have been disabled.');
			myLog('pmmed', '!mode: DJ limits disabled');
		} else if (newMode.match(/^play[0-9]+/)) {
			var maxPlays = Math.round(newMode.substr(4));
			if (maxPlays > 0) {
				mode.maxUnits = maxPlays == 1 ? ' song' : ' songs';
				mode.maxPlays = maxPlays;
				bot.speak('DJs will now be removed after playing '+mode.maxPlays+mode.maxUnits+'.  Read more: http://thephish.fm/modes/');
				mode.type = 'playN';
				myLog('pmmed', '!mode:play'+maxPlays+' initated by '+senderid);
			} else {
				bot.speak('Bad input. Mode disabled.');
				myLog('pmmed', '!mode: Bad input, disabled DJ limits');
			}
		} else if (newMode.match(/^timed[0-9]+/)) {
			var maxTime = Math.round(newMode.substr(5));
			if (maxTime > 0) {
				mode.maxUnits = maxTime == 1 ? ' minute' : ' minutes';
				var seconds = maxTime*60;
				bot.speak('DJs will now be removed after playing '+maxTime+mode.maxUnits+' of tracks. Read more: http://thephish.fm/modes/');
				myLog('pmmed', '!mode:timed'+maxTime+' now in effect');
				mode.maxTime = seconds;
				mode.type = 'timed';
			}
		} else if (newMode.match(/^speed[0-9]+/)) {
			var maxTime = Math.round(newMode.substr(5));
			if (maxTime > 0) {
				mode.maxUnits = maxTime == 1 ? ' minute' : ' minutes';
				var seconds = maxTime*60;
				bot.speak('DJs must play songs under '+maxTime+mode.maxUnits+' to stay on the stage. Read more: http://thephish.fm/modes/');
				myLog('pmmed', '!mode:speed'+maxTime+' now in effect');
				mode.maxTime = seconds;
				mode.type = 'speed';
			}
		} else {
			bot.pm('Huh?', senderid);
			myLog('pmmed', '!mode: Unintelligble');
		}
	} else if (text.match(/^!mode/)) {
		if (mode.type) {
			if (!mode['data']) { mode['data'] = new Array(); }
			var roominfo = bot.roomInfo(false, function(data) {
				var djs = data.room.metadata.djs;
				if (djs.indexOf(senderid) == -1) {
					mode['data'][senderid] = 0;
					myLog('pmmed', '!mode Reset '+senderid+' count to 0');
				} else { 
					if (!mode['data'][senderid]) { 	
						myLog('pmmed', '!mode No value for mode['+senderid+'], setting to 0');
						mode['data'][senderid]=0; 				
					}	
					if (mode.type=='timed') {
						var units = mode['data'][senderid] == 1 ? ' minute' : ' minutes';
						var minutes = mode['data'][senderid] ? Math.round(mode['data'][senderid]/60) : 0;
						bot.pm("You have played about "+minutes+units+".", senderid);
						myLog('pmmed', "!mode reply - You have played about "+minutes+units+".");
					} else if (mode.type=='playN') {
						var units = mode['data'][senderid] == 1 ? ' song' : ' songs';
						bot.pm("You have played "+mode['data'][senderid]+units+".", senderid);
						myLog("pmmed", "!mode reply - You have played "+mode['data'][senderid]+units+".");
					}
				}
			});
			if (mode.type == 'playN') {
				bot.pm('DJs will now be removed after playing '+mode.maxPlays+mode.maxUnits+'.  Read more: http://thephish.fm/modes/', senderid);
				myLog('pmmed', '!mode reply - DJs will now be removed after playing '+mode.maxPlays+mode.maxUnits+'.  Read more: http://thephish.fm/modes/');  
			} else if (mode.type == 'timed') {
				bot.pm('DJs will now be removed after playing '+mode.maxTime/60+mode.maxUnits+' of tracks. Read more: http://thephish.fm/modes/', senderid);
				myLog('pmmed', '!mode reply - DJs will now be removed after playing '+mode.maxTime/60+mode.maxUnits+' of tracks. Read more: http://thephish.fm/modes/');  
			}
		} else {
			bot.pm('No DJ limits at the moment', senderid);
			myLog('pmmed', '!mode reply - No DJ limits at the moment');  
		}
	}	
	
	if (text.match(/^##/i)) {
		var note = escape(text.substr(2));		
		bot.roomInfo(true, function(data) {
			if (showdate = parseDate(data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album)) {
				var options = {url: apibase+'note.php?userid='+senderid+'&starttime='+data.room.metadata.current_song.starttime+'&visibility=private&content='+note };
				http.get(options, function(error, res) {
					if (error) {
						myLog('speak', '## note - Error connecting to '+options['url']);
					} else {
						var noteResponse = res.buffer;
						if (noteResponse == "success") {
							myLog('pmmed', '## note - Stored note.');
							bot.pm('Private note stored! Private notes appear on your stats profile if you signed in (reply !connect to sign in)', senderid);
						} else if (noteResponse == "not found") {
							bot.pm('This song didn\'t get logged in stats', senderid);
							myLog('pmmed', '## note - Failed note, could not find song.');
						} else {
							myLog('pmmed', '## note - Failed note, fell out of if-block.');
							bot.pm('Hm, something went wrong.', senderid);
						}
					}
				});
			} else {
				bot.speak('I can\'t note this without the showdate.');
			}
		});
	}
		
});

