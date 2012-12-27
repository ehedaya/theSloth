#!/usr/bin/env sh
cd /home/thephishvps/bots/
m=`pgrep -f "theSloth/bot.js" | wc -l`
if  [ $m -gt 0 ]
then
	m=`pgrep -f "theSloth/bot.js"`
	echo "Process $m found"
else
	/usr/bin/nohup /home/thephishvps/usr/local/bin/node /home/thephishvps/bots/theSloth/bot.js >> /home/thephishvps/bots/theSloth.out 2>&1&
fi
