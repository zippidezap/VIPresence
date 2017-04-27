
var Botkit = require('./lib/Botkit.js');

var controller = Botkit.sparkbot({
    debug: false,
    log: false,
    public_address:  "https://CHANGE ME",
    ciscospark_access_token: "Mjg4YmIwYzYtMDE2Yi00YzNhLThiNWQtMzM1NDNkMTc0MjFhNWUyYzIzMjYtOWZi",
    studio_token: process.env.studio_token, // get one from studio.botkit.ai to enable content management, stats, message console and more
    secret: process.env.secret, // this is an RECOMMENDED but optional setting that enables validation of incoming webhooks
    webhook_name: 'Cisco Spark bot created with Botkit, override me before going to production',
});

var bot = controller.spawn({});
var externalName = "";
var externalMac = "";
var cutDown;
var cachedMac;
var lookingForName = false;
var lookingForMac = false;
var foundColon = false;
var toRemove;
//Lower level functions for manipulating and retrieving data from our tracking array.

//Example MAC addresses
var trackingList = [
    {user: "Kyle", mac: "20:20:20:20:20:20"},
    {user: "Jordan", mac: "10:10:10:10:10:10"},
    {user: "Elena", mac: "30:30:30:30:30:30"}
];
function getMacArray(name){

    return name.user === externalName;

}
function getNameArray(mac){

    return mac.mac === externalMac;
}

Object.prototype.getKey = function(value){
  for(var key in this){
    if(this[key] == value){
      return key;
    }
  }
  return null;
};

//Top Level Functions for retrieving and appending names or macs from our tracking array.

function getMac(name){

externalName = name;
var result = trackingList.find(getMacArray);
return result[Object.keys(result)[1]];

}
function getName(mac){

externalMac = mac;
var result = trackingList.find(getNameArray);
return result[Object.keys(result)[0]];

}
function addPerson(name, address){

    //IF THE PERSON EXISTS
    trackingList.push({user: name, mac: address});
}
function deletePerson(name){
    for(i = 0; i < trackingList.length; i++){
        if(trackingList[i]["user"] == name){
            trackingList.splice(i,1);
            break;
        }
    }
    //IF THE PERSON ISN'T THERE
}
function deleteMac(mac){
    for(i = 0; i < trackingList.length; i++){
        if(trackingList[i]["mac"] == mac){
            trackingList.splice(i,1);
            break;
        }
    }
    //IF THE PERSON ISN'T THERE
}

controller.setupWebserver(process.env.PORT || 3000, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log("Cisco Spark: Webhooks set up!");
    });
});

controller.middleware.receive.use(function(bot, message, next) {

  console.log(message);
  next();
});


controller.on('user_room_join', function(bot, message) {
    bot.reply(message, "Hi there, I'm VIPresence, if you want to know more about me just type 'Help'.");
});

controller.on('bot_space_join', function(bot, message) {
    bot.reply(message, "Hi there, I'm VIPresence, if you want to know more about me just type 'Help'.");
});

controller.on('direct_mention', function(bot, message) {

    var preParse = message.text;
    var colonPosition = 0;
    var numberofColons = 0;

    if(lookingForName){

        bot.reply(message, "Awesome, I'll start monitoring " + preParse + " with mac address " + cachedMac);
        addPerson(preParse,cachedMac);
        lookingForName = false;

   } else if(lookingForMac){
        //Preparse and cachedMac are swapped here so as to not create another 2 variables
        //Preparse is the mac here, and cachedMac is the name :)
        bot.reply(message, "Awesome, I'll start monitoring " + cachedMac + " with mac address " + preParse);
        addPerson(cachedMac, preParse);
        lookingForMac = false;

        console.log(trackingList);
        } else{

            if(preParse == "help" || preParse == "Help"){

                        bot.reply(message, "VIPresence is a presence tracking Spark Bot that utilises Cisco Meraki’s Location Analytics to monitor different users. VIPresence uses MAC address’ (hardware address’) of devices to notify you as to when this address is seen on your network.      \n\n"
                        + "To track a new person, use the *Track* command, then a colon, then either the MAC address or name:       \n"
                        + "- *Track* **‘:’**  *45:45:45:45:45:45* | *Jordan*     \n\n"

                        + "To stop tracking a person, use the *Forget* command, then a colon, then either the MAC address or name:      \n"
                        +"-	*Forget* **‘:’** *Jordan*      \n"
                        +"-	*Forget* **‘:’** *45:45:45:45:45:45*      \n\n"

                        +"To show a list of who is currently being monitored, use the *Show Tracking* command:      \n"
                        +"-	*Show Tracking*");

            }

            if(preParse == "show tracking" || preParse == "Show Tracking"){

                var toPrint = "";
                for(i = 0; i < trackingList.length; i++){
                    toPrint += trackingList[i]["user"];
                    toPrint += " : ";
                    toPrint += trackingList[i]["mac"];
                    toPrint += "    \n";
                }
                bot.reply(message, toPrint);

                console.log(trackingList);
            }

            foundColon = false;

            for(i = 0; i < preParse.length; i++){

                if(preParse[i] === ":"){
                    colonPosition = i;
                    foundColon = true;
                    break
                }
            }

            cutDown = preParse.substr(colonPosition + 1);
            while(cutDown[0] === " "){
                cutDown = cutDown.substr(1);
            }


            for(i = 0; i < cutDown.length; i++){

                if(cutDown[i] === ":"){
                    numberofColons++;
                }
            }

            if(foundColon == true){
                if(numberofColons == 5){
                    //We found a mac
                    var found = false;
                    cachedMac = cutDown;
                    for(i = 0; i < trackingList.length; i++){
                        if(trackingList[i]["mac"] == cutDown){
                            //If we already track the mac
                            found = true;
                            toRemove = cutDown;
                            bot.reply(message, "Are you sure you want to stop monitoring " + cutDown + "? [yes or no]?");
                            controller.hears(['^yes'], 'direct_message,direct_mention', function(bot, message) {
                                bot.reply(message, "Sure thing, I'll stop looking out for them!");
                                deleteMac(toRemove);
                                return;
                            });
                            controller.hears(['^no'], 'direct_message,direct_mention', function(bot, message) {
                                bot.reply(message, "Ok, I won't, let me know if I can do anything else!");
                                return;
                            });
                            break;
                        }
                    }
                    if(!found){
                        //If we don't already track the mac
                        bot.reply(message, "Do you want me to start monitoring " + cutDown + "? [yes or no]?");
                        controller.hears(['^yes'], 'direct_message,direct_mention', function(bot, message) {
                            bot.reply(message, "Ok cool, what's the name of the person?");
                            lookingForName = true;
                            return;
                        });
                        controller.hears(['^no'], 'direct_message,direct_mention', function(bot, message) {
                            bot.reply(message, "Ok, I won't, let me know if I can do anything else!");
                            return;
                        });
                    }

                } else {
                    var found = false;
                    //COULD BE A NAME?
                    for(i = 0; i < trackingList.length; i++){
                        if(trackingList[i]["user"] == cutDown){
                            found = true;
                            toRemove = cutDown;
                            bot.reply(message, "Are you sure you want to stop monitoring " + cutDown + "? [yes or no]?");
                            controller.hears(['^yes'], 'direct_message,direct_mention', function(bot, message) {
                                bot.reply(message, "Sure thing, I'll stop looking out for them!");
                                deletePerson(toRemove);
                                return;
                            });
                            controller.hears(['^no'], 'direct_message,direct_mention', function(bot, message) {
                                bot.reply(message, "Ok, I won't, let me know if I can do anything else!");
                                return;
                            });
                            break;
                        }
                    }
                    if(!found){
                        //If we don't already track the name
                        bot.reply(message, "Do you want me to start monitoring " + cutDown + "? [yes or no]?");
                        cachedMac = cutDown;
                        controller.hears(['^yes'], 'direct_message,direct_mention', function(bot, message) {
                            bot.reply(message, "Ok cool, what's the mac address of " + cachedMac + "?");
                            lookingForMac = true;
                            return;
                        });
                        controller.hears(['^no'], 'direct_message,direct_mention', function(bot, message) {
                            bot.reply(message, "Ok, I won't, let me know if I can do anything else!");
                            return;
                        });
                    }
                }
            }
        }
});

controller.on('direct_message', function(bot, message) {

    var preParse = message.text;
    var colonPosition = 0;
    var numberofColons = 0;

    if(lookingForName){

        bot.reply(message, "Awesome, I'll start monitoring " + preParse + " with mac address " + cachedMac);
        addPerson(preParse,cachedMac);
        lookingForName = false;

   } else if(lookingForMac){
        //Preparse and cachedMac are swapped here so as to not create another 2 variables
        //Preparse is the mac here, and cachedMac is the name :)
        bot.reply(message, "Awesome, I'll start monitoring " + cachedMac + " with mac address " + preParse);
        addPerson(cachedMac, preParse);
        lookingForMac = false;

        console.log(trackingList);
        } else{

            if(preParse == "help" || preParse == "Help"){

                        bot.reply(message, "VIPresence is a presence tracking Spark Bot that utilises Cisco Meraki’s Location Analytics to monitor different users. VIPresence uses MAC address’ (hardware address’) of devices to notify you as to when this address is seen on your network.      \n\n"
                        + "To track a new person, use the *Track* command, then a colon, then either the MAC address or name:       \n"
                        + "- *Track* **‘:’**  *45:45:45:45:45:45* | *Jordan*     \n\n"

                        + "To stop tracking a person, use the *Forget* command, then a colon, then either the MAC address or name:      \n"
                        +"-	*Forget* **‘:’** *Jordan*      \n"
                        +"-	*Forget* **‘:’** *45:45:45:45:45:45*      \n\n"

                        +"To show a list of who is currently being monitored, use the *Show Tracking* command:      \n"
                        +"-	*Show Tracking*");

            }

            if(preParse == "show tracking" || preParse == "Show Tracking"){

                var toPrint = "";
                for(i = 0; i < trackingList.length; i++){
                    toPrint += trackingList[i]["user"];
                    toPrint += " : ";
                    toPrint += trackingList[i]["mac"];
                    toPrint += "    \n";
                }
                bot.reply(message, toPrint);

                console.log(trackingList);
            }

            foundColon = false;

            for(i = 0; i < preParse.length; i++){

                if(preParse[i] === ":"){
                    colonPosition = i;
                    foundColon = true;
                    break
                }
            }

            cutDown = preParse.substr(colonPosition + 1);
            while(cutDown[0] === " "){
                cutDown = cutDown.substr(1);
            }


            for(i = 0; i < cutDown.length; i++){

                if(cutDown[i] === ":"){
                    numberofColons++;
                }
            }

            if(foundColon == true){
                if(numberofColons == 5){
                    //We found a mac
                    var found = false;
                    cachedMac = cutDown;
                    for(i = 0; i < trackingList.length; i++){
                        if(trackingList[i]["mac"] == cutDown){
                            //If we already track the mac
                            found = true;
                            toRemove = cutDown;
                            bot.reply(message, "Are you sure you want to stop monitoring " + cutDown + "? [yes or no]?");
                            controller.hears(['^yes'], 'direct_message,direct_mention', function(bot, message) {
                                bot.reply(message, "Sure thing, I'll stop looking out for them!");
                                deleteMac(toRemove);
                                return;
                            });
                            controller.hears(['^no'], 'direct_message,direct_mention', function(bot, message) {
                                bot.reply(message, "Ok, I won't, let me know if I can do anything else!");
                                return;
                            });
                            break;
                        }
                    }
                    if(!found){
                        //If we don't already track the mac
                        bot.reply(message, "Do you want me to start monitoring " + cutDown + "? [yes or no]?");
                        controller.hears(['^yes'], 'direct_message,direct_mention', function(bot, message) {
                            bot.reply(message, "Ok cool, what's the name of the person?");
                            lookingForName = true;
                            return;
                        });
                        controller.hears(['^no'], 'direct_message,direct_mention', function(bot, message) {
                            bot.reply(message, "Ok, I won't, let me know if I can do anything else!");
                            return;
                        });
                    }

                } else {
                    var found = false;
                    //COULD BE A NAME?
                    for(i = 0; i < trackingList.length; i++){
                        if(trackingList[i]["user"] == cutDown){
                            found = true;
                            toRemove = cutDown;
                            bot.reply(message, "Are you sure you want to stop monitoring " + cutDown + "? [yes or no]?");
                            controller.hears(['^yes'], 'direct_message,direct_mention', function(bot, message) {
                                bot.reply(message, "Sure thing, I'll stop looking out for them!");
                                deletePerson(toRemove);
                                return;
                            });
                            controller.hears(['^no'], 'direct_message,direct_mention', function(bot, message) {
                                bot.reply(message, "Ok, I won't, let me know if I can do anything else!");
                                return;
                            });
                            break;
                        }
                    }
                    if(!found){
                        //If we don't already track the name
                        bot.reply(message, "Do you want me to start monitoring " + cutDown + "? [yes or no]?");
                        cachedMac = cutDown;
                        controller.hears(['^yes'], 'direct_message,direct_mention', function(bot, message) {
                            bot.reply(message, "Ok cool, what's the mac address of " + cachedMac + "?");
                            lookingForMac = true;
                            return;
                        });
                        controller.hears(['^no'], 'direct_message,direct_mention', function(bot, message) {
                            bot.reply(message, "Ok, I won't, let me know if I can do anything else!");
                            return;
                        });
                    }
                }
            }
        }
    });

    if (process.env.studio_token) {
        controller.on('direct_message,direct_mention', function(bot, message) {
            controller.studio.runTrigger(bot, message.text, message.user, message.channel).then(function(convo) {
                if (!convo) {
                     console.log('NO STUDIO MATCH');
                }
            }).catch(function(err) {
                console.error('Error with Botkit Studio: ', err);
            });
        });
}


//*********************************************************************************************************
//********************************** MERAKI LOCATION ANALYTICS ********************************************
//*********************************************************************************************************
// Using a free NGROK account you only have access to one connection at a time so this is run in a
// differet file on the free version to utilise a single port

// Specific CMX instance, and our NGROK port
var port = process.env.OVERRIDE_PORT || process.env.PORT || 3010;
var secret = process.env.SECRET || "CHANGE ME";
var validator = process.env.VALIDATOR || "CHANGE ME";

var express = require('express');
var app = express();
var bodyParser = require('body-parser')
app.use(bodyParser.json())

//Return the secret and the validator
app.get("", function (req, res) {
    console.log("Validator = " + validator);
    res.status(200).send(validator);
});

// Getting POSTs
app.post("", function (req, res) {
    if (req.body.secret == secret) {
        console.log("Secret authorised");
        cmxData(req.body);
    } else {
        console.log("Secret unauthorised");
    }
    res.status(200);
});

app.listen(port, function () {
    console.log("Meraki CMX Receiver now listening on port: " + port);
});

//When Meraki Posts an update from their end.
function cmxData(data) {
    var json = data;

    for(i = 0; i < json.data.observations.length; i++){
        for(j = 0; j < trackingList.length; j++){
            if(trackingList[j]["mac"] == json.data.observations[i].clientMac){
                var tempName = getName(json.data.observations[i].clientMac);
                bot.reply(message, "Look out! " + tempName + " who we're monitoring has just entered the store!");
            }
        }
    }
};
