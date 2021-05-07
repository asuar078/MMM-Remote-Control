const {networkInterfaces} = require('os');
const {exec} = require("child_process");
const wifi = require('node-wifi');

const scan = (wifiInterface, networksCallback) => {
    // Initialize wifi module
    // Absolutely necessary even to set interface to null
    wifi.init({
        iface: wifiInterface // network interface, choose a random wifi interface if set to null
    });


    // Scan networks
    wifi.scan((error, networks) => {
        if (error) {
            // console.log(error);
            networksCallback([])
        } else {
            // console.log(networks);
            const withName = networks.filter((net) => {
                return net.ssid
            })
            networksCallback(withName)
        }
    })
}

const currentConnection = (wifiInterface, callback) => {
    // Initialize wifi module
    // Absolutely necessary even to set interface to null
    wifi.init({
        iface: wifiInterface // network interface, choose a random wifi interface if set to null
    });

    // List the current wifi connections
    wifi.getCurrentConnections((error, currentConnections) => {
        if (error) {
            callback([])
        } else {
            // console.log(currentConnections);
            callback(currentConnections)
        }
    });
}

const scanWithCurrentConnection = (wifiInterface, networksCallback) => {
    scan(wifiInterface, (networks) => {

        if (networks.length === 0) {
            networksCallback([])
            return;
        }
        currentConnection(wifiInterface, (connected) => {

            for (let network of networks) {
                if (connected.length === 0) {
                    network["connected"] = false;
                    continue;
                }

                for (const connection of connected) {
                    network["connected"] = connection["mac"] === network["mac"];
                }

            }

            networksCallback(networks)
        })
    })
}

// wifiCred: { ssid: 'ssid', password: 'password' }
const connect = (wifiInterface, wifiCred, connectCallback) => {

    // Initialize wifi module
    // Absolutely necessary even to set interface to null
    wifi.init({
        iface: wifiInterface // network interface, choose a random wifi interface if set to null
    });

    // Connect to a network
    // wifi.connect({ ssid: 'ssid', password: 'password' }, error => {
    wifi.connect(wifiCred, error => {
        if (error) {
            console.log(error);
            connectCallback(false)
        } else {
            console.log('Connected');
            connectCallback(true)
        }
    });

}

const CONNECT_SCRIPT_PATH = '/home/pi/MagicMirror/modules/MMM-Remote-Control/wifi_connect.sh'
// wifiCred: { ssid: 'ssid', password: 'password' }
const sudoConnect = (wifiInterface, wifiCred, callback) => {
    try {
        exec(`${CONNECT_SCRIPT_PATH} \"${wifiInterface}\" \"${wifiCred.ssid}\" \"${wifiCred.password}\"`,
            (error, stdout, stderr) => {
                try {
                    if (error) {
                        console.log(`connection error ${error}`)
                        callback(false)
                        return;
                    }
                    if (stderr) {
                        console.log(`connection error: ${stderr}`);
                        callback(false)
                        return;
                    }
                    console.log(stdout)
                    callback(true)
                } catch (e) {
                    console.log(`error ${e}`)
                    callback(false)
                }
            });
    } catch (e) {
        console.log(`connection error ${e}`)
        callback(false)
    }
}

const getNetworkIP = () => {

    const nets = networkInterfaces();
    const results = Object.create(null); // Or just '{}', an empty object

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }

    // console.log(results['wlp0s20f3'][0])
    return results
}

// getNetworkIP()
// scan("wlp0s20f3", (network) => {
// scan("wlan1", (network) => {
//     console.log("networks")
//     console.log(network)
// });
//
// currentConnection("wlan1", (connections) => {
//     console.log("connections")
//     console.log(connections)
// })

// sudoConnect("wlan1", {ssid: "My Guest Network", password: "my pass"}, (connected) => {
//     console.log(`connected: ${connected}`)
// })

// scanWithCurrentConnection("wlan1", (networks) => {
//     console.log(networks)
// })

module.exports.scan = scan;
module.exports.currentConnection = currentConnection;
module.exports.scanWithCurrentConnection = scanWithCurrentConnection;
module.exports.connect = connect;
module.exports.sudoConnect = sudoConnect;
module.exports.getNetworkIP = getNetworkIP;
