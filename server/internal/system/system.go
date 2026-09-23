package system

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
)

func getUpTime() (float64, error) {

	data, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return 0, err
	}

	fields := strings.Fields(string(data))

	if len(fields) == 0 {
		return 0, fmt.Errorf("invalid /proc/uptime")
	}

	return strconv.ParseFloat(fields[0], 64)
}

func getHostName() (string, error) {

	data, err := os.ReadFile("/etc/hostname")
	if err != nil {
		return "", err
	}

	hostname := strings.TrimSpace(string(data))

	return hostname, nil
}

func getIpAddress() (string, error) {

	val, err := net.Interfaces()

	if err != nil {
		return "", err
	}

	address := ""

	for _, value := range val {

		if value.Flags&net.FlagUp == 0 || value.Flags&net.FlagBroadcast == 0 || value.Flags&net.FlagRunning == 0 {
			continue
		}

		addrArr, err := value.Addrs()

		if err != nil {
			return "", err
		}

		for _, addr := range addrArr {

			ipNet, ok := addr.(*net.IPNet)

			if ok {

				ip := ipNet.IP.To4()

				if ip == nil {
					continue
				}
				address = ip.String()
				break
			}
		}

		if address != "" {
			break
		}
	}

	if address == "" {
		return address, fmt.Errorf("No running ip address")
	}

	return address, nil

}
