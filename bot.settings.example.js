AUTH   	= ''; 
USERID 	= '';
ROOMID 	= '';

// Phish.net API keys
PNPK = '';
PNUK = '';

// Global variables
apibase = '';
apikey = '';
is_dj = false;
awesomes = new Array();
awesomeTriggers = /(awesome|great|sick|nasty|good)/i;
admins = new Array('');
holdspot = false;
lastsong = false;
greeting = false;
replay = false;
blacklist = new Array();
ignored	= new Array();
moderators = new Array();
blacklistReasons = new Array('http://i.imgur.com/ibFLX.gif', 'http://i.imgur.com/Pjc52.gif', 'http://i.imgur.com/lDs7b.gif');
mode = new Object();
idleTime = new Object();
mode.cantDj = null;
modeBootPending = false;
replayOverride = false;
lastPlayedResponse = '';
djspot = new Array();
var usersList = { };