interface=$1
ssid=$2
pass=$3

echo "Interface: $interface, network ssid: $ssid, password: $pass"
sudo nmcli -w 10 device wifi connect "$ssid" password "$pass" ifname "$interface"
