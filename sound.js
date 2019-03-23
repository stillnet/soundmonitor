// nodejs

var gpio = require("gpio");
var fs = require("fs");
var Mqtt = require('azure-iot-device-mqtt').Mqtt;
var DeviceClient = require('azure-iot-device').Client
var Message = require('azure-iot-device').Message;
var os = require("os");
var hostname = os.hostname();

try {
        var connectionString = fs.readFileSync('./connectionstring.txt', 'utf8').trim();
}
catch (e) {
        console.log('Error: could not read connectionstring.txt. Create this file with your connection string in it')
        process.exit()
}

var client = DeviceClient.fromConnectionString(connectionString, Mqtt);

let OFF = 1
let ON = 0
var state = 0
var lastTriggered = null
var lastState = null

var sensorIn = gpio.export(75, {
           direction: gpio.DIRECTION.IN,
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
                //console.log('checking last timestamp, its ' + lastTriggered)
                if (new Date() - lastTriggered < 2000) {
                        state = 1
                }
                else {
                        state = 0
                }
                //console.log('state is now ' + getState())
        }, 500);

        var checkStateinterval = setInterval(function() {
                var currentState = getState()
                if (lastState != null && lastState != currentState) {
                        console.log('state changed, its now ' + currentState)

                        if (currentState == 1) {
                                var message = new Message(JSON.stringify({
                                        timestamp: new Date(),
                                        water_on: currentState
                                }))
                                
                                message.properties.add('hostname', hostname);
                                
                                client.sendEvent(message, function (err) {
                                if (err) {
                                        console.error('send error: ' + err.toString());
                                } else {
                                        console.log('message sent');
                                }
                                })
                        }
                }
                ledOut.set(currentState)
                lastState = currentState
        }, 500);

}

function handleChange(val) {
        //console.log('value changed to ' + val )
        lastTriggered = new Date()
}

function getState() {
        return state
}
    

process.on('SIGINT', () => {
          ledOut.set(0);
          ledOut.unexport();
          sensorIn.unexport();
          process.exit()
});
