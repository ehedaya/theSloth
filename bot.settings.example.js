AUTH   	= ''; 
USERID 	= '';
ROOMID 	= '';

// Phish.net API keys
PNPK = '';
PNUK = '';

// The bot's own userid
selfUserid = '';

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
moderators = new Array();
blacklistReasons = new Array('');
mode = new Object();
idleTime = new Object();
mode.cantDj = null;
modeBootPending = false;
replayOverride = false;
lastPlayedResponse = '';
djspot = new Array();