// nodejs
process.chdir('/home/stillnet/soundmonitor')

var gpio = require("gpio");
var fs = require("fs");
var Mqtt = require('azure-iot-device-mqtt').Mqtt;
var DeviceClient = require('azure-iot-device').Client
var Message = require('azure-iot-device').Message;
var os = require("os");
var hostname = os.hostname();
var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream('/var/log/sound.log', {flags : 'w'});
var log_stdout = process.stdout;
var ThingSpeakClient = require('thingspeakclient');

var TSclient = new ThingSpeakClient({updateTimeout: 16000});
TSclient.attachChannel(, { writeKey:''}, TSattachhandler);

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

console.log('Program started at ' + new Date())

function TSattachhandler(err, resp) {
        console.log('Thingspeak attach handler called with ' + err + ', ' + resp)
}


function TSupdatehandler(err, resp) {
        console.log('Thingspeak update handler called with ' + resp)
}


try {
        var connectionString = fs.readFileSync('./connectionstring.txt', 'utf8').trim();
}
catch (e) {
        console.log('Error: could not read connectionstring.txt. Create this file with your connection string in it')
        process.exit()
}

try {
        var connectionString2 = fs.readFileSync('./connectionstring2.txt', 'utf8').trim();
}
catch (e) {
        console.log('Error: could not read connectionstring2.txt. Create this file with your connection string in it')
        process.exit()
}

var client  = DeviceClient.fromConnectionString(connectionString,  Mqtt);
var client2 = DeviceClient.fromConnectionString(connectionString2, Mqtt);

let OFF = 1
let ON = 0
var pumpstate = 0
var pinstate = 0
var lastTriggered = null
var lastPumpState = null
var triggers = 0

var sensorIn = gpio.export(75, {
           direction: gpio.DIRECTION.IN,
	   interval: 100,
           ready: function() {
                   console.log('input ready')
                   setup()
                      }
});

var ledOut = gpio.export(74, {
           direction: gpio.DIRECTION.OUT,
           ready: function() {
                   console.log('led ready')
                      }
});


function setup() {
        sensorIn.on("change", handleChange);
        var checkLastTriggeredinterval = setInterval(function() {
                var tmpPinState = getPinState()
                if (tmpPinState) {
                        triggers++
			console.log('Incremented tigger to ' + triggers)
                }
                else {
			if (triggers != 0)
		                console.log('reset triggers to 0 at ' + new Date())
                        triggers=0
                }

                // if we've been triggered more than 1 times (that is, on more than 1.5s), then change pump state.
                // This should help avoid false positives (bumps and bangs that trigger for only a short time)
                if (triggers > 15) {
                        setPumpState(1)
                }
                else {
                        setPumpState(0)
                }
                //console.log('pumpstate is now ' + getPumpState())
        }, 100);

        /*
        var checkStateinterval = setInterval(function() {
                var currentState = getState()
                if (lastState != null && lastState != currentState) {
                        stateChanged(lastState, currentState)
                }

                if (currentState == 1) {
                        
                }

                ledOut.set(currentState)
                lastState = currentState
        }, 100);
        */

}

function setPumpState(newState) {
        ledOut.set(newState)
 
        if (lastPumpState != newState)
                pumpStateChanged(lastPumpState,newState)

        pumpState = newState
        lastPumpState = newState

}

function getPumpState(state) {
        return pumpState
}

function pumpStateChanged(oldState,newState) {
        console.log(new Date() + ' State changed - was ' + oldState + ', now its ' + newState)

        var message = new Message(JSON.stringify({
                timestamp: new Date(),
                pump_on: newState,
                pump_on_telemetry: newState
        }))
        
        message.properties.add('hostname', hostname);
        
        client.sendEvent(message, function (err) {
                if (err) {console.error('send error: ' + err.toString());}
                else {    console.log('message sent to Azure (Client 1)');}
                })
                
        client2.sendEvent(message, function (err) {
                if (err) {console.error('send error: ' + err.toString());}
                else {    console.log('message sent to Azure (Client 2)');}
                })
        
        TSclient.updateChannel(, {field1: newState}, function(err, resp) {
                console.log('Sending ' + newState + ' to ThingSpeak at ' + new Date())
                if (!err && resp > 0) {
                    console.log('Success! Entry number was: ' + resp);
                }
                else {
                    console.log('Failed! Received: ' + resp)
                }
            })
}

function handleChange(val) {
        //console.log('Pin change! value changed to ' + val )
        // invert it. Our sensor sends LOW to indicate sound
        pinstate = !val
        lastTriggered = new Date()
}

function getPinState() {
        return pinstate
}

process.on('SIGINT', () => {
          ledOut.set(0);
          ledOut.unexport();
          sensorIn.unexport();
          process.exit()
});
