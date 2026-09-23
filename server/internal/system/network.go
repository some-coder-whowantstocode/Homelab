package system

import (
	"fmt"
	"homelab/internal/utils"
	"net"
	"os"
	"strings"
)

type networkInfo struct {
	Interface string
	RXRate    uint64
	TXRate    uint64
	RXBytes   uint64
	TXBytes   uint64
	RXPackets uint64
	TXPackets uint64
	RXErrors  uint64
	TXErrors  uint64
	RXDrops   uint64
	TXDrops   uint64
}

func getNetworkInfo() (networkInfo, error) {

	var netData networkInfo

	val, err := net.Interfaces()
	if err != nil {
		return netData, err
	}

	interfaceName := ""

	for _, value := range val {

		if value.Flags&net.FlagUp == 0 || value.Flags&net.FlagBroadcast == 0 || value.Flags&net.FlagRunning == 0 {
			continue
		}

		interfaceName = value.Name

	}

	if interfaceName == "" {
		return netData, fmt.Errorf("No Interface Found")
	}

	fileData, err := os.ReadFile("/proc/net/dev")
	if err != nil {
		return netData, err
	}

	var name string
	var body string

	data := strings.Split(string(fileData), "\n")

	for _, line := range data {

		line = strings.TrimSpace(line)

		lineParts := strings.Split(line, ":")

		if len(lineParts) < 2 {
			continue
		}

		name = lineParts[0]
		body = lineParts[1]

		if name == interfaceName {
			break
		}
	}

	if name == "" {
		return netData, fmt.Errorf("network interface %q not found", interfaceName)
	}

	fields := strings.Fields(body)

	if len(fields) < 12 {
		return netData, fmt.Errorf("invalid network statistics for %s", interfaceName)
	}

	rxBytes := utils.ConvertStrToUint64(fields[0])
	rxPackets := utils.ConvertStrToUint64(fields[1])
	rxErrors := utils.ConvertStrToUint64(fields[2])
	rxDrops := utils.ConvertStrToUint64(fields[3])

	txBytes := utils.ConvertStrToUint64(fields[8])
	txPackets := utils.ConvertStrToUint64(fields[9])
	txErrors := utils.ConvertStrToUint64(fields[10])
	txDrops := utils.ConvertStrToUint64(fields[11])

	netData = networkInfo{
		Interface: interfaceName,
		RXBytes:   rxBytes,
		TXBytes:   txBytes,
		RXPackets: rxPackets,
		TXPackets: txPackets,
		RXErrors:  rxErrors,
		TXErrors:  txErrors,
		RXDrops:   rxDrops,
		TXDrops:   txDrops,
	}

	return netData, nil

}
