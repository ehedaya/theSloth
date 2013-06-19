var Bot    	= require('ttapi');
var http   	= require('http-get');
var fs		= require('fs');
var md5 = require('MD5');
var dp = require('./date.js');
var settings = require('./bot.settings.js');
var bot = new Bot(AUTH, USERID, ROOMID);
bot.debug = false;

fs.heartbeat =  function() {
	this.writeFile(__dirname+"/.heartbeat", getEpoch(), function(err) {
		if(err) {
			console.log(err);
		}
	}); 
}

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

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function authKey() {
	return md5(getEpoch()+apikey);
}

function songLog(callback) {
	this.history = [];
	this.addSong = function addSong(created, artist, album) {
		this.history.push({'created':created, 'album':album, 'artist':artist});
	}
	this.prune = function(cutoff) {
		for(i=0;i<this.history.length;i++) {
			if(this.history[i].created < cutoff) {
				this.history.splice(i,1);
			}
		}
	}
	this.getCount = function(field,value) {
		var count = 0;
		for(i=0;i<this.history.length;i++) {
			if(this.history[i][field].length>0) {
				count += (this.history[i][field]) == value ? 1 : 0;		
			}
		}
		return count;
	}
	this.getList = function(field) {
		var output = [];
		for(i=0;i<this.history.length;i++) {
			output.push(this.history[i][field]);
		}
		return output.join();
	}
}

bot.on('newsong', function(data) { 
	fs.heartbeat();
	var dateBlob = data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album;
	var songname = 	data.room.metadata.current_song.metadata.song, 
		artist = 	escape(data.room.metadata.current_song.metadata.artist),
		songid = 	escape(data.room.metadata.current_song._id),
		starttime = escape(Math.floor(data.room.metadata.current_song.starttime)),
		album = 	escape(data.room.metadata.current_song.metadata.album),
		song = 		escape(data.room.metadata.current_song.metadata.song),
		tracktime = escape(data.room.metadata.current_song.metadata.length),
		userid = 	escape(data.room.metadata.current_dj);
	awesomes.length = 0;
	if (mode.cantDj) { myLog('newsong', 'mode.cantDj value is '+mode.cantDj); }
	var showdate = parseDate(dateBlob);
	var lastPlayedResponse = '';
	
	songLog.addSong(starttime, data.room.metadata.current_song.metadata.artist, data.room.metadata.current_song.metadata.album);
	
	if (songLog.getCount('artist', data.room.metadata.current_song.metadata.artist) == 4) {
		bot.speak(":warning: The artist '"+data.room.metadata.current_song.metadata.artist+"' has been played 4 times in the last 3 hours.");
	}
	
	if (songLog.getCount('album', data.room.metadata.current_song.metadata.album) == 3) {
		bot.speak(":warning: The album '"+data.room.metadata.current_song.metadata.album+"' has been played 3 times in the last 3 hours.");
	}

	// Boot DJs according to mode 
	if (mode.type) {
		if (!mode[userid]) { mode[userid] = 0; }
		if (mode.type=='timed' && (mode[userid]+tracktime>=mode.maxTime)) {
			myLog('newSong', 'Pending autoboot for '+userid+' accumulated '+mode[userid]+', limit is '+mode.maxTime);
			modeBootPending = true;
		} else if (mode.type=='playN' && (mode[userid]+1>=mode.maxPlays)) {
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
	// If there is a replay starting in the next 4 hours, is this song in the replay?
	var options = {bufferType: 'buffer', url:apibase+'isSongInReplay.php?starttime='+starttime };
	http.get(options, function(error, res) {
		if (error) {
			myLog('newSong', 'Replay song check - Error connecting to '+options['url']);
		} else {
			if (isJsonString(res.buffer)) {
				var result = JSON.parse(res.buffer);
				if (result.success && result.songInReplay) {
					myLog('newSong', 'Replay song check - exists!');
					bot.speak(result.message);
				}
			} else {
				myLog('newSong', 'JSON.parse error - '+res.buffer);
			}
		}
	});

	// Daily ghost
	if (data.room.metadata.current_song.metadata.artist.match(/Daily\sGhost/i)) {
		bot.speak(':ghost:'+data.room.metadata.current_song.metadata.album);
	}
});
bot.on('roomChanged',  function (data) {
	fs.heartbeat();
  usersList = { };
  for (var i=0; i<data.users.length; i++) {
    var user = data.users[i];
    user.lastActivity = Date.now();
    usersList[user.userid] = user;
  }
});

bot.on('endsong', function(data) {
	fs.heartbeat();
	var upvotes = data.room.metadata.upvotes,
		listeners = data.room.metadata.listeners,
		starttime = Math.floor(data.room.metadata.current_song.starttime),
		userid = 	escape(data.room.metadata.current_dj),
		tracktime = escape(data.room.metadata.current_song.metadata.length),
		name = data.room.metadata.current_song.djname;
		mode.cantDj = null;
	songLog.prune(getEpoch()-(60*60*3));
	if(mode.type) {
		if (!mode[userid]) { mode[userid] = 0;  }
		if(mode.type == 'playN') {
			mode[userid] = mode[userid] ? mode[userid]+1 : 1;
			myLog('endSong', name+' has '+mode[userid]+' plays');
			if (mode[userid] >= mode.maxPlays) {
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
	}
	if (lastsong) {
		myLog('endSong', 'Booting '+lastsong+' via !lastsong');
		bot.remDj(lastsong);
		lastsong = false;
	}
});

bot.on('new_moderator', function (data) {
	fs.heartbeat();
 });

bot.on('add_dj', function(data) {
	fs.heartbeat();
	var new_dj_id = data.user[0].userid;
	var new_dj_name = data.user[0].name;
	var new_dj_avatar_id = data.user[0].avatarid;
	var options = { bufferType: 'buffer', url:apibase+'user.php?key='+authKey()+'&id='+new_dj_id+'&name='+escape(new_dj_name)+'&avatarid='+new_dj_avatar_id+'&format=json' };
	http.get(options, function(error, res) {
		if (error) {
			myLog('addDj','bot.on(add_dj) - Error connecting to '+options['url']);
		} else {
			if (isJsonString(res.buffer)) {
				var json = JSON.parse(res.buffer);
				if (json.status == 'new' && new_dj_id != USERID) {
					bot.pm('Hey '+new_dj_name+', welcome to thePhish! Please read this before playing your first track - http://thephish.fm/tips', new_dj_id);
					myLog('addDj', 'Sent welcome message to  '+new_dj_name);
				}
			} else {
				myLog('addDj', 'JSON.parse error - '+res.buffer+' (URL was '+options.url+')');
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
});

bot.on('rem_dj', function(data) {
	if ((djspot['mode'] == 'reservation') && (djspot['reservedfor'] == data.userid)) {
		myLog('remDj', 'Holding spot for '+data.userid);
		bot.addDj();
		bot.vote('up');
		bot.speak('/me waves to the crowd.');
		djspot['on_stage'] = true;
	}
	fs.heartbeat();
});
bot.on('update_votes', function (data) {
  var votelog = data.room.metadata.votelog;
  for (var i=0; i<votelog.length; i++) {
    var userid = votelog[i][0];
  }
  fs.heartbeat();
});


bot.on('speak', function (data) {
   var name = data.name;
   var text = data.text;
   var userid = data.userid;
   var setlist = null;
   
   fs.heartbeat();
   
   
   
   
   

	var chatResponses = [
		{ trigger: new RegExp('^!help$','i'), response: 'http://stats.thephish.fm/about.php' },
		{ trigger: new RegExp('^!tips$','i'), response: 'http://thephish.fm/tips/'},
		{ trigger: new RegExp('^!(bugs|bug|feature|features)$','i'), response: 'https://github.com/ehedaya/theSloth/issues/new/'},
		{ trigger: new RegExp('^!stats$','i'), response: 'http://stats.thephish.fm'},
		{ trigger: new RegExp('^!gifs$','i'), response: 'http://tinyurl.com/ttgifs'},
		{ trigger: new RegExp('^!deg$','i'), response: 'http://tinyurl.com/phishdeg'},
		{ trigger: new RegExp('^!greet$','i'), response: greeting},
		{ trigger: new RegExp('^!slide$','i'), response: 'http://thephish.fm/theslide'},
		{ trigger: new RegExp('^!(about|commands|sloth)$','i'), response: 'https://github.com/ehedaya/theSloth/wiki/Commands'},
		{ trigger: new RegExp('^commands$','i'), response: 'https://github.com/ehedaya/theSloth/wiki/Commands'},
		{ trigger: new RegExp('^!m[e]{1,2}[t]{1,2}up[s]{0,1}$','i'), response: 'http://thephish.fm/meettups'},
		{ trigger: new RegExp('^!ttplus$','i'), response: 'TT+ info: http://turntableplus.fm/beta'},
		{ trigger: new RegExp('^[!+](add(me)?|list|q|qa)$','i'), response: 'K '+name+', you\'re on "the list!"'},
		{ trigger: new RegExp('feed.+sloth','i'), response: randomItem(['ITALIAN SPAGHETTI!','*omnomnom*', '/me burps'])},
		{ trigger: new RegExp('(pets|hugs).+sloth','i'), response: randomItem(['http://tinyurl.com/slothishappy', '<3', 'http://tinyurl.com/coolsloth'])},
		{ trigger: new RegExp('(lick|spam|dose).+sloth','i'), response: '/me stabs '+name},
		{ trigger: new RegExp('dances with.+sloth','i'), response: '/me dances with '+name},
		{ trigger: new RegExp('^!new$', 'i'), response: 'http://bit.ly/slothNew'},
		{ trigger: new RegExp('^!pnet$', 'i'), response: 'To link your stats, Fan me and then send a PM with !pnet:username (replace username with your .net username). If you update your stats on Phish.net, PM me !pnet to refresh.'},
		{ trigger: new RegExp('^!attendance$', 'i'), response: 'http://thephish.fm/attendance'},
                { trigger: new RegExp('^!replayroom$', 'i'), response: 'http://preview.tinyurl.com/thephishreplayroom'},
		{ trigger: new RegExp('^!tickets$', 'i'), response: 'http://thephish.fm/tickets'}
	];
	for(t=0;t<chatResponses.length;t++) {
		if (text.match(chatResponses[t].trigger)) {
			bot.speak(chatResponses[t].response); 
		}
	}

   if (text.match(/^!notes$/i)) {
		bot.roomInfo(true, function(data) {
			var starttime = Math.floor(data.room.metadata.current_song.starttime);
	   		bot.speak('Prefix notes with ## and I\'ll save them for later. For example: http://stats.thephish.fm/'+starttime);		
		});

   }
	if (text.match(/^!countdown$/i)) {
		var options = {bufferType: 'buffer', url:apibase+'getCountdownToNextShow.php' };
		http.get(options, function(error, res) {
			if (error) {
				myLog('speak', '!countdown - Error connecting to '+options['url']);
			} else {
				if (isJsonString(res.buffer)) {
					var json = JSON.parse(res.buffer);
					if(json.success) {
						bot.speak(json.message);
					}
				} else {
					myLog('speak', '!countdown - JSON parse error: '+res.buffer);
				}
			}
		});
	}
	if (text.match(/^!phanniversary$/i)) {
		var options = {bufferType: 'buffer', url:apibase+'phanniversary.php' };
		http.get(options, function(error, res) {
			if (error) {
				myLog('speak', '!countdown - Error connecting to '+options['url']);
			} else {
				if (isJsonString(res.buffer)) {
					var json = JSON.parse(res.buffer);
					if(json.success) {
						bot.speak(json.message);
					}
				} else {
					myLog('speak', '!countdown - JSON parse error: '+res.buffer);
				}
			}
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
					var options = {bufferType: 'buffer', url:apibase+'getUsersAtShow.php?key='+authKey()+'&date='+showdate+'&u='+usersHere };
					http.get(options, function(error, res) {
						if (error) {
							myLog('speak', '!who - Error connecting to '+options['url']);
						} else {
							if (isJsonString(res.buffer)) {
								json = JSON.parse(res.buffer);
								bot.speak(json.message);
							} else {
								myLog('speak', '!who Unparseable JSON: '+res.buffer);
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
					var options = {bufferType: 'buffer', url:apibase+'lastPlayed.php?showdate='+showdate+'&starttime='+Math.floor(data.room.metadata.current_song.starttime) };
					http.get(options, function(error, res) {
						if (error) {
							myLog('speak', '!last - Error connecting to '+options['url']);
						} else {
							if (isJsonString(res.buffer)) {
								json = JSON.parse(res.buffer);
								if (json.success) {
									myLog('speak', '!last - Stored note.');
									bot.speak(json.message);
								} else {
									myLog('speak', 'JSON failure in !last: '+res.buffer);
								}
							} else {
								myLog('speak', '!last Unparseable JSON: '+res.buffer);
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
				var options = {bufferType: 'buffer', url:apibase+'note.php?key='+authKey()+'&userid='+userid+'&starttime='+Math.floor(data.room.metadata.current_song.starttime)+'&visibility=public&content='+note };
				http.get(options, function(error, res) {
					if (error) {
						myLog('speak', '## note - Error connecting to '+options['url']);
					} else {
						if (isJsonString(res.buffer)) {
							json = JSON.parse(res.buffer);
							if (json.success) {
								myLog('pmmed', '## note - Stored note.');
							} else {
								myLog('pmmed', 'JSON failure in private note: '+res.buffer);
								bot.pm('Hm, your note was not stored. ('+json.message+')', userid);
							} 
						} else {
							myLog('pmmed', 'Unparseable JSON in private note: '+options.url);
							bot.pm('Whoops, something went wrong.');
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
			var options = { bufferType: 'buffer', url:apibase+'replay.php' };
			http.get(options, function(error, res) {
				if (error) {
					myLog('speak', '!replay - Error connecting to '+options['url']);
				} else {
					if(isJsonString(res.buffer)) {
						json = JSON.parse(res.buffer);
						bot.speak(json.message);
					} else {
						myLog('speak', '!replay - Unparsable JSON: '+res.buffer);
					}
				}
			});
		}
	}
	if (text.match(/^!groove$/i)) {
		var options = {bufferType: 'buffer', url:apibase+'groove.php' };
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
		var options = {bufferType: 'buffer', url:apibase+'points.php?userid='+userid+'&target='+points };
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
   
   if (text.match(/^\!setlist$/)) {	 
   		bot.roomInfo(true, function(data) {
   			if (showdate = parseDate(data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album)) {
   				bot.speak('http://phish.net/setlists/?d='+showdate);
   			} else {
				bot.speak('I couldn\'t find a date in any fields: '+data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album);
			}
   		});
   }
   if (text.match(/^\!phishtracks$/)) {	 
   		bot.roomInfo(true, function(data) {
   			if (showdate = parseDate(data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album)) {
   				bot.speak('http://phishtracks.com/shows/'+showdate);
   			} else {
				bot.speak('I couldn\'t find a date in any fields: '+data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album);
			}
   		});
   }
   
	if (text.match(/^!birthday/i)) {
		var options = {bufferType: 'buffer', url:apibase+'getUserBirthdays.php' };
		http.get(options, function(error, res) {
			if (error) {
				myLog('speak', '!birthday - Error connecting to '+options['url']);
			} else {
				if (isJsonString(res.buffer)) {
					var json = JSON.parse(res.buffer);
					bot.speak(json.message);
				} else {
					myLog('speak', '!birthday - JSON parse error: '+res.buffer);
				}
			}
		});
	}
	if (text.match(/^!history/i)) {
		bot.roomInfo(true, function(data) {
			var options = {bufferType: 'buffer', url:apibase+'getSongHistory.php?starttime='+Math.floor(data.room.metadata.current_song.starttime) };
			http.get(options, function(error, res) {
				if (error) {
					myLog('speak', '!history - Error connecting to '+options['url']);
				} else {
					if (isJsonString(res.buffer)) {
						var json = JSON.parse(res.buffer);
						bot.speak(json.message);
					} else {
						myLog('speak', '!history - JSON parse error: '+res.buffer);
					}
				}
			});	
		});
	}

   
   
   
	   
});

bot.on('update_user', function (data) {
	fs.heartbeat();
});

bot.on('registered', function(data) {
	var name = escape(data.user[0].name);
	var name2 = data.user[0].name;
	var userid = escape(data.user[0].userid);
	var avatarid = data.user[0].avatarid;
	var points = data.user[0].points;

	var user = data.user[0];
	usersList[user.userid] = user;	
	
	if(userid === USERID) {	// Just starting up
		songLog = new songLog();
   		bot.roomInfo(true, function(data) {
   			var roomHistory = data.room.metadata.songlog;
			for(i=roomHistory.length-2;i>=0;i--) {
				songLog.addSong(roomHistory[i].created, roomHistory[i].metadata.artist, roomHistory[i].metadata.album);
			}
		});
		myLog('registered', 'theSloth just entered the room.  Probably a reboot.');
	}
	
	var options = { bufferType: 'buffer', url:apibase+'user.php?key='+authKey()+'&id='+userid+'&name='+escape(data.user[0].name)+'&avatarid='+avatarid+'&format=json' };
	if (blacklist.contains(userid)) {
		bot.bootUser(userid, randomItem(blacklistReasons));
		return;
	} else {
		http.get(options, function(error, res) {
			if (error) {
				myLog('registered', 'Not on cached blacklist, checking database, error connecting to '+options['url']);
			} else {
				if (isJsonString(res.buffer)) {
					var json = JSON.parse(res.buffer);
					if (json.status == 'banned') {
						bot.bootUser(userid, randomItem(blacklistReasons));
						blacklist.push(userid);
						myLog('registered', 'Booted blacklisted user '+userid);
						return;
					} 
				} else {
					myLog('registered', 'JSON.parse error - '+res.buffer+' (URL was '+options.url+')');
				}
			}
		});
		if (replayOverride) {
			bot.pm(replayInfo, userid);
		} else {
			var options = { bufferType: 'buffer', url:apibase+'replay.php' };
			http.get(options, function(error, res) {
				if (error) {
					myLog('pmmed', '!replay - Error connecting to '+options['url']);
				} else {
					if(isJsonString(res.buffer)) {
						json = JSON.parse(res.buffer);
						if (json.replay_later_today == true) {
							bot.pm(json.message, userid);
						}
					} else {
						myLog('registered', '!replay - Unparsable JSON: '+res.buffer);
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
	fs.heartbeat();

});

bot.on('deregistered', function(data) {
	delete usersList[data.user[0].userid];
	fs.heartbeat();
});

bot.on('pmmed', function (data) { 
	var roominfo = bot.roomInfo(true, function(data) {
		moderators = data.room.metadata.moderator_id;
	});
	var senderid = data.senderid;
	var userid = data.userid;
	var text = data.text;

	fs.heartbeat();

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
				var options = { bufferType: 'buffer', url:'http://api.phish.net/api.js?api=1.0&method=getShow&apikey='+PNPK+'&linked=0&format=json&showdate='+showdate };
				http.get(options, function(error, res) {
						if (error) {
							var d = new Date();
							myLog('pmmed', '!setlisfull - Error connecting to '+options['url']);
						} else {
						   if (isJsonString(res.buffer)) {
								var json = JSON.parse(res.buffer);
								var setlistdata = json[0].setlistdata;
								var setlist = setlistdata.replace(/(<([^>]+)>)/ig,"");
								bot.pm(setlist, senderid);
								myLog('pmmed', '!setlisfull - Retrieved setlist successfully');
							} else {
								myLog('pmmed', 'JSON.parse error - '+res.buffer);
							}						
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
   		if (text.match(/^!avatar:/)) {
   			bot.setAvatar(text.substr(8));
   			myLog('pmmed', 'Set avatar to '+text.substr(8));
   		}
   	}
   	if (text.match(/(awesome|great|sick|nasty|good)/i)) {
		if (!awesomes.contains(senderid)) {
			awesomes.push(senderid);
		}
   		if ((awesomes.length) >= 3) {
   			bot.vote('up');
                        for(var i=9;i<18;i++){
                                bot.setAvatar(i);
                                pause(500);
                        }
  		}
   	}
   	
   	
   	if (text.match(/^!connect$/i)) {
   		var token = getGuid();
		var options = { bufferType: 'buffer', url:apibase+'key.php?key='+authKey()+'&id='+senderid+'&token='+token };
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
				} else if (cdj == senderid && modeBootPending) {
					bot.pm('Sorry sir, I have my orders.', senderid);
				} else {
					myLog('pmmed', '!lastsong - Pending autoboot for '+lastsong+' canceled');
					lastsong = false;
					bot.pm('*sigh*', senderid);
				}			
			} else if ((cdj!=senderid)&&(moderators.contains(senderid))){
				if (!lastsong && !modeBootPending) {
					lastsong = cdj;
					myLog('pmmed', '!lastsong - Pending autoboot issued by '+senderid+' for '+cdj);
					bot.pm('As you wish.', senderid);
				} else if (lastsong && !modeBootPending) {
					myLog('pmmed', '!lastsong - Pending autoboot for '+lastsong+' canceled by '+senderid);
					lastsong = false;
					bot.pm('*sigh*', senderid);
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
			var options = { bufferType: 'buffer', url:apibase+'ban.php?key='+authKey()+'&name='+badusername+'&format=json'};
			myLog('pmmed', '!blacklist - Looking up user '+badusername+' with '+options['url']+'');
			http.get(options, function(error, res) {
					if (error) {
						var d = new Date();
							myLog('pmmed', '!blacklist - Error connecting to '+options['url']);
					} else {
						if (isJsonString(res.buffer)) {
							result = JSON.parse(res.buffer);
							if (result.success) {
								if (moderators.contains(result.userid)) {
									myLog('pmmed', '!blacklist - Cannot blacklist moderator '+badusername);
									bot.pm('Sorry, I can\'t blacklist a moderator.  You must first remove moderator status.', senderid);
								} else {
									bot.bootUser(result.userid, randomItem(blacklistReasons));
									myLog('pmmed', '!blacklist - Booting user '+result.userid);
									bot.pm(badusername+' is now on the blacklist.  Visit http://stats.thephish.fm/banned.php after using !connect to undo this.', senderid);
								}
							} else {
								if (result.message == "duplicate") {
									bot.pm("User was already banned.", senderid);
									myLog('pmmed', '!blacklist - User was already banned: '+badusername);
								} else if (result.message == "not found") {
									bot.pm("Cannot find user "+badusername, senderid);
									myLog('pmmed', '!blacklist - User not found: '+badusername);
								} else {
									bot.pm("Something went wrong. Tell Emil!", senderid);
									myLog('pmmed', '!blacklist - Fatal error looking up: '+badusername);
								}	
							}
						} else {
							myLog('pmmed', 'JSON.parse error - '+res.buffer);
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
		var options = { bufferType: 'buffer', url:apibase+'getTimeSongLastPlayed.php?song='+songname };
		http.get(options, function(error, res) {
			if (error) {
				myLog('pmmed', '!last [song] - Error connecting to '+options['url']);
			} else {
				if (isJsonString(res.buffer)) {
					var json = JSON.parse(res.buffer);
					bot.pm(json.message, senderid);
				} else {
					bot.pm('Oops, something went wrong.', senderid);
					myLog('pmmed', 'Unparseable response: '+res.buffer);						
				}
			}
		});
	}
	
    if (text.match(/^!whois:/)) {	 
   		var whoisName = escape(text.substr(7));
		var options = { bufferType: 'buffer', url:apibase+'whois.php?name='+whoisName };
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
			} else if (mode.type == 'speed') {
				bot.speak('DJs must play songs under '+mode.maxTime/60+mode.maxUnits+' to stay on the stage. Read more: http://thephish.fm/modes/');
				myLog('pmmed', '!mode reply - DJs must play songs under '+mode.maxTime/60+mode.maxUnits+' to stay on the stage. Read more: http://thephish.fm/modes/');  
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
				var options = {bufferType: 'buffer', url:apibase+'note.php?key='+authKey()+'&userid='+senderid+'&starttime='+Math.floor(data.room.metadata.current_song.starttime)+'&visibility=private&content='+note };
				http.get(options, function(error, res) {
					if (error) {
						myLog('speak', '## note - Error connecting to '+options['url']);
					} else {
						if (isJsonString(res.buffer)) {
							json = JSON.parse(res.buffer);
							if (json.success) {
								myLog('pmmed', '## note - Stored note.');
								bot.pm('Private note stored! View your private notes here: '+json.url, senderid);
							} else {
								myLog('pmmed', 'JSON failure in private note: '+res.buffer);
								bot.pm('Hm, your note was not stored. ('+json.message+')', senderid);
							} 
						} else {
							myLog('pmmed', 'Unparseable JSON in private note: '+options.url);
							bot.pm('Whoops, something went wrong.');
						}
					}
				});
			} else {
				bot.speak('I can\'t note this without the showdate.');
			}
		});
	}
   if (text.match(/^!pnet:/)) {
   		var pnet_username = escape(text.substr(6));
		var options = { bufferType: 'buffer', url:apibase+'pnet_connect.php?key='+authKey()+'&userid='+senderid+'&pnet_username='+pnet_username };
		http.get(options, function(error, res) {
			if (error) {
				myLog('pmmed', '!pnet: - Error connecting to '+options['url']);
			} else {
				bot.pm(res.buffer, senderid);
			}
		});   
   }
   if (text.match(/^!birthday:/)) {
   		var birthday = escape(text.substr(10));
		var options = { bufferType: 'buffer', url:apibase+'birthday.php?key='+authKey()+'&userid='+senderid+'&birthday='+birthday };
		http.get(options, function(error, res) {
			if (error) {
				myLog('pmmed', '!birthday: - Error connecting to '+options['url']);
			} else {
				if (isJsonString(res.buffer)) {
					json = JSON.parse(res.buffer);
					bot.pm(json.message, senderid);
				} else {
					myLog('pmmed', '!birthday: - JSON parse error '+res.buffer);
				}
			}
		});   
   }
   if (text.match(/^!pnet$/)) {
		var options = { bufferType: 'buffer', url:apibase+'pnet_connect.php?key='+authKey()+'&userid='+senderid+'&refresh=1' };
		http.get(options, function(error, res) {
			if (error) {
				myLog('pmmed', '!pnet - Error connecting to '+options['url']);
			} else {
				bot.pm(res.buffer, senderid);
			}
		});   
   }
   if (text.match(/^!balance$/)) {
		var options = { bufferType: 'buffer', url:apibase+'plusminus.php?userid='+senderid };
		http.get(options, function(error, res) {
			if (error) {
				myLog('pmmed', '!balance - Error connecting to '+options['url']);
			} else {
				bot.pm(res.buffer, senderid);
			}
		});   
   }
   if (text.match(/^!unplayed /)) {
		var song = escape(text.substr(10));		
		var options = {bufferType: 'buffer', url:apibase+'getRandomUnplayedSong.php?song='+song };
		http.get(options, function(error, res) {
			if (error) {
				myLog('speak', '!unplayed - Error connecting to '+options['url']);
			} else {
				var songlist = res.buffer;
				if (songlist.length > 1) {
					bot.pm(songlist, senderid);
				} 
			}
		});
   }   

	if (text.match(/^[*]{1,5}$/i)) {
		var rating = text.length;		
		bot.roomInfo(true, function(data) {
			myLog('pmmed', senderid+' assigns a rating of '+rating+' to '+Math.floor(data.room.metadata.current_song.starttime));
			if (showdate = parseDate(data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album)) {
				var options = {bufferType: 'buffer', url:apibase+'rating.php?key='+authKey()+'&userid='+senderid+'&starttime='+Math.floor(data.room.metadata.current_song.starttime)+'&rating='+rating };
				http.get(options, function(error, res) {
					if (error) {
						myLog('pmmed', 'rating - Error connecting to '+options['url']);
					} else {
						if (isJsonString(res.buffer)) {
							var ratingResponse = JSON.parse(res.buffer);
							if (ratingResponse.success) {
								bot.pm(ratingResponse.message, senderid);
							} else {
								bot.pm('Hmm, I couldn\'n find this song in the database. *shrug*');
							}
						} else {
							myLog('pmmed', 'Unparseable response: '+res.buffer);						
						}
					}
				});
			} else {
				bot.pm('I can\'t rate this without the showdate.', senderid);
			}
		});
	}
	if (text.match(/^!download/i)) {
   		bot.roomInfo(true, function(data) {
			if (showdate = parseDate(data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album)) {
				var options = {bufferType: 'buffer', url:apibase+'getDownload.php?date='+showdate };
				http.get(options, function(error, res) {
					if (error) {
						myLog('speak', '!download - Error connecting to '+options['url']);
					} else {
						if (isJsonString(res.buffer)) {
							var json = JSON.parse(res.buffer);
							bot.pm(json.message, senderid);
						} else {
							myLog('speak', '!download - JSON parse error: '+res.buffer);
						}
					}
				});
			} else {
				bot.speak("I can't figure out the showdate.");
			}
		});
	}
	if (text.match(/^!request:/i)) {
		var showdate = text.substr(9);
		var options = {bufferType: 'buffer', url:apibase+'postReplayRequest.php?showdate='+showdate+'&userid='+senderid+'&key='+authKey() };
		http.get(options, function(error, res) {
			if (error) {
				myLog('speak', '!request - Error connecting to '+options['url']);
			} else {
				if (isJsonString(res.buffer)) {
					var json = JSON.parse(res.buffer);
					bot.pm(json.message, senderid);
				} else {
					myLog('speak', '!request - JSON parse error: '+res.buffer);
				}
			}
		});
	}
	if (text.match(/^!ago$/i)) {
		bot.pm("Hmm, give me a second...", senderid);
		var options = {bufferType: 'buffer', url:apibase+'getOldestFavorite.php?id='+senderid };
		http.get(options, function(error, res) {
			if (error) {
				myLog('speak', '!ago - Error connecting to '+options['url']);
			} else {
				if (isJsonString(res.buffer)) {
					var json = JSON.parse(res.buffer);
					bot.pm(json.message, senderid);
				} else {
					myLog('speak', '!ago - JSON parse error: '+res.buffer);
				}
			}
		});
	}
	if (text.match(/^!album:/i)) {
		var album = text.substr(7);
		if (songLog.getCount('album', album)>0) {
			bot.pm("The album '"+album+"' has been played "+songLog.getCount('album', album)+" time(s) in the last 3 hours.", senderid);
		} else {
			bot.pm("Hm, I don't think any tracks from that album have been played in the last 3 hours.", senderid);
		}
	}
	if (text.match(/^!artist:/i)) {
		var artist = text.substr(8);
		if (songLog.getCount('artist', artist)>0) {
			bot.pm("The artist '"+artist+"' has been played "+songLog.getCount('artist', artist)+" time(s) in the last 3 hours.", senderid);
		} else {
			bot.pm("Hm, I don't think any tracks by that artist have been played in the last 3 hours.", senderid);
		}
	}
 	if (text.match(/^!(albums|artists)$/i)) {
 		songLog.prune(getEpoch()-(60*60*3));
		var which = text.substr(1) == 'albums' ? 'album' : 'artist';
 		bot.pm("Recent "+which+": "+songLog.getList(which), senderid);
 	}
	if (text.match(/^!average:/i)) {
   		bot.roomInfo(true, function(data) {
			var interval = text.substr(9);
			var userid = data.room.metadata.current_dj;
			var options = {bufferType: 'buffer', url:apibase+'getAveragePlayLength.php?userid='+userid+'&interval='+interval };
			http.get(options, function(error, res) {
				if (error) {
					myLog('pmmed', '!average - Error connecting to '+options['url']);
				} else {
					if (isJsonString(res.buffer)) {
						var json = JSON.parse(res.buffer);
						bot.pm(json.message, senderid);
					} else {
						myLog('pmmed', '!average - JSON parse error: '+res.buffer);
					}
				}
			});
		});
	}
 	
});

