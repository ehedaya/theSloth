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
is_dj = false;
is_dj = false;
is_preshow = false;
is_postshow = false;
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