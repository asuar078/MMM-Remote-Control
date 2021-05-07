nmcli con add type wifi ifname wlan0 con-name WIFI_AP autoconnect yes ssid WitchMirror
nmcli con modify WIFI_AP 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared
nmcli con modify WIFI_AP wifi-sec.key-mgmt wpa-psk
nmcli con modify WIFI_AP wifi-sec.psk "WitchMirror"
nmcli con up WIFI_AP
