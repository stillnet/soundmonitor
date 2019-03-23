var gpio = require("gpio");

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
