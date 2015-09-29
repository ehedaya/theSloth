TheSloth = {
	options: {
		dubtrack: {
			apiBase: 'https://api.dubtrack.fm',
			roomId: '55f8353d44809b0300f88699'
		},
		thephish: {
			apiBase: 'https://stats.thephish.fm/api',
		}
	},
	setupEvents: function() {
		var $this = this;
		console.debug("theSloth: Setting up events");

		Dubtrack.room.chat.model.on('change', function(model) {
			console.debug("theSloth: Chat detected", model.toJSON());
		});
		
		Dubtrack.room.model.on('change', function(model) {
			console.debug("theSloth: Room change detected", model.toJSON());
			$this.relayCurrentTrack();
		});
	},
	relayCurrentTrack: function(){
		var $this = this;
		$.getJSON(this.options.dubtrack.apiBase + '/room/' + this.options.dubtrack.roomId + '/playlist/active', function(response) {
			if(response && response.code == 200) {
				console.debug("theSloth: relayCurrentTrack - Current track", response.data);
				$this.parseDate(response.data.songInfo.name, function(showdate) {
					var r = response.data;
					var payload = {
						now_playing: {
							cid: r.songInfo.fkid,
							author: r.songInfo.songArtist,
							title: r.songInfo.name,
							format: r.songInfo.type == "soundcloud" ? 2 : 1,
							duration: r.songInfo.songLength / 1000,
							dj_id: r.song._user,
							positive: r.song.updubs,
							negative: r.song.downdubs,
							curates: 0
						}
					}
					$this.relayEvent(payload, 'now_playing.php')
				});
			}
		});
	},
	parseDate: function(blob, callback) {
        var r = /[0-9]{1,4}[\-\/\s\.\\]{1,2}[0-9]{1,2}[\-\/\s\.\\]{1,2}[0-9]{1,4}/;
        var showdate = blob.match(r); 
        if (showdate) {
                var d = moment(showdate[0]);
                if (d) {
 					callback(d.format('YYYY-MM-DD'));
                } else {
					callback(false);
                }
        }  else {
                callback(false);
        }
	},	
	parsePhishShowdate: function(callback) {
		var self = this;
		var now_playing = API.getMedia();
		if(!now_playing) {
			return false;
		}
		var blob = now_playing.author+now_playing.title;
		var showlist_json = localStorage.getItem('showlist');
		var showlist = JSON.parse(showlist_json);
		this.parseDate(blob, function(showdate) {
			if(showdate.length) {
				var found_show = false;
				$.each(showlist, function(showdate_index,venue_long) {
					if(showdate_index == showdate) {
						found_show = true;
						callback(showdate);
					}
				});
				if(!found_show) {
					callback(false);
				}
			} else {
 				callback(false);
			}
		});
	},
	relayEvent: function(payload, endpoint) {
		console.debug("Relaying event", payload, endpoint);
		var self = this;
		if(window.location.href != "https://www.dubtrack.fm/join/thephish") {
			return false;
		}
		data = payload;
						
		$.ajax({
			crossDomain:true,
			type: "POST",
			url: "https://stats.thephish.fm/api/" + endpoint,
			data: data,
			success: function(response){
				console.debug(data, response, JSON.parse(response));
				var response_JSON = JSON.parse(response);
				if(response_JSON && response_JSON.to_be_spoken && response_JSON.to_be_spoken.length) {
					self.insertChat(response_JSON.to_be_spoken, {"fromID" : API.getUser()});
				}
				if(response_JSON.db_play) {
					var d = response_JSON.db_play;
					if(d.show && d.show.showdate) {
						self.now_playing_showdate = d.show.showdate;
					} else {
						self.now_playing_showdate = null;
					}
					console.log(self.now_playing_showdate);
				}
			}
		});
	},
	insertChat: function(message, chatObj) {
		console.debug("insertChat");
// 		var user = API.getUser();
// 		if(user.id == chatObj.uid) {
// 			API.sendChat(message);
// 		}
	},	
	simpleResponses: [],
	fetchSimpleResponses: function() {
		var $this = this;
		$.getJSON('https://stats.thephish.fm/api/getSimpleResponses.php', function(responses) {
			var updatedSimpleResponses = [];
			_.each(responses, function(a) { 
				updatedSimpleResponses.push(
					{
						'trigger': new RegExp(a.regexp, 'i'), 
						'response': a.response 
					}
				); 
			});
			console.log('Updated simple responses');
			$this.simpleResponses = updatedSimpleResponses;
		});
	},
	syncShowCache: function() {
		var self = this;
		$.ajax({
			crossDomain:true,
			type: "GET",
			url: "https://stats.thephish.fm/api/getAllShows.php",
			success: function(response){
				("Refreshed local show list");
				localStorage.removeItem('showlist');
				localStorage.setItem('showlist', response);
			},
			error: function(response) {
				console.log("Error retrieving show cache");
			}
		});
	},
	syncShowAttendees: function() {
		var self = this;
		$.ajax({
			crossDomain:true,
			type: "GET",
			url: "https://stats.thephish.fm/api/getUsersAtShow.php",
			success: function(response){
				("Refreshed show attendee list");
				localStorage.removeItem('show_attendees');
				localStorage.setItem('show_attendees', response);
			},
			error: function(response) {
				console.log("Error retrieving show cache");
			}
		});
	},
	logger: function(message) {
		console.debug("theSloth: "+message);
	}
}

// Wait for the PlugAPI to be available before instantiating
function initialize() {
	if(Dubtrack && Dubtrack.room && Dubtrack.room.model) {
			console.debug('theSloth: API connected.');
			TheSloth.setupEvents();
			TheSloth.syncShowCache();
			TheSloth.syncShowAttendees();
			TheSloth.fetchSimpleResponses();

	} else {
			console.debug('theSloth: API not connected.  Retrying....');
		setTimeout(initialize, 1000);
	}
}

initialize();