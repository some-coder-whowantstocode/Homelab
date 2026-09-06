package main

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"
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

func getMemInfo() ([2]int, error) {

	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return [2]int{0, 0}, err
	}

	fields := strings.Split(string(data), "\n")

	if len(fields) < 2 {
		return [2]int{0, 0}, fmt.Errorf("invalid /proc/meminfo")
	}

	TotalMemory := strings.Fields(strings.Fields(fields[0])[1])[0]
	AvailableMemory := strings.Fields(strings.Fields(fields[1])[1])[0]

	TotalMemoryInt, err := strconv.Atoi(TotalMemory)
	if err != nil {
		TotalMemoryInt = 0
	}

	AvailableMemoryInt, err := strconv.Atoi(AvailableMemory)
	if err != nil {
		AvailableMemoryInt = 0
	}

	return [2]int{TotalMemoryInt, AvailableMemoryInt}, nil
}

func getHostName() (string, error) {

	data, err := os.ReadFile("/etc/hostname")
	if err != nil {
		return "", err
	}

	hostname := string(data)

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

func getCurrentCpuData() ([2]int, error) {

	data, err := os.ReadFile("/proc/stat")
	if err != nil {
		return [2]int{0, 0}, err
	}

	lines := strings.Split(string(data), "\n")
	if len(lines) == 0 {
		return [2]int{0, 0}, fmt.Errorf("No process information available")
	}

	total := 0
	idle := 0

	processInfo := strings.Fields(lines[0])
	for i, pUnit := range processInfo {

		unit, err := strconv.Atoi(pUnit)
		if err != nil {
			continue
		}

		if i == 4 || i == 5 {
			idle += unit
		}
		total += unit
	}

	return [2]int{total, idle}, nil
}

func storeStatus() {

	var lastTotal int = 0
	var lastIdle int = 0
	var lastCpuUsage float64 = 0

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		getStatus(&lastTotal, &lastIdle, &lastCpuUsage)
	}
}

func getStatus(lastTotal *int, lastIdle *int, lastCpuUsage *float64) {

	uptime, err := getUpTime()
	if err != nil {
		fmt.Println(err.Error())
		uptime = 0
	}

	mems, err := getMemInfo()
	if err != nil {
		fmt.Println(err.Error())
		mems = [2]int{0, 0}
	}

	hostname, err := getHostName()
	if err != nil {
		fmt.Println(err.Error())
		hostname = ""
	}

	address, err := getIpAddress()
	if err != nil {
		fmt.Println(err.Error())
		address = ""
	}

	var memoryPercentage float64 = 0

	if mems[0] != 0 {

		memoryPercentage = float64(mems[0]-mems[1]) / float64(mems[0]) * 100
	}

	meminfo := memInfo{
		Total: uint64(mems[0]),
		Free:  uint64(mems[1]),
		Used:  uint64(mems[0] - mems[1]),
		Usage: memoryPercentage,
	}

	var cpuUsage float64 = 0

	cpuData, err := getCurrentCpuData()
	if err != nil {
		fmt.Println(err.Error())

		cpuUsage = *lastCpuUsage
	} else {

		if *lastTotal == 0 && *lastIdle == 0 {

			*lastTotal = cpuData[0]
			*lastIdle = cpuData[1]
		} else {

			totalDelta := cpuData[0] - *lastTotal
			totalIdle := cpuData[1] - *lastIdle

			if totalDelta != 0 {
				cpuUsage = float64(totalDelta-totalIdle) / float64(totalDelta) * 100
			}

			*lastTotal = cpuData[0]
			*lastIdle = cpuData[1]
			*lastCpuUsage = cpuUsage
		}

	}

	diskInfo, err := getDiskInfo()
	if err != nil {
		fmt.Println(err.Error())
	}

	statMU.Lock()
	stats = systemStats{
		Uptime:   uptime,
		Memory:   meminfo,
		Hostname: hostname,
		IP:       address,
		CPU:      cpuUsage,
		Disk:     diskInfo,
	}
	statMU.Unlock()

}

func getDiskInfo() (diskInfo, error) {

	var statfs syscall.Statfs_t
	var diskinfo diskInfo

	err := syscall.Statfs("/", &statfs)
	if err != nil {
		return diskinfo, err
	}

	total := statfs.Blocks * uint64(statfs.Bsize)
	available := statfs.Bavail * uint64(statfs.Bsize)
	free := statfs.Bfree * uint64(statfs.Bsize)
	used := total - available

	var usage float64 = 0

	if total != 0 {
		usage = float64(used) / float64(total) * 100
	}

	diskinfo = diskInfo{
		Total:     total,
		Available: available,
		Free:      free,
		Used:      used,
		Usage:     usage,
	}

	return diskinfo, nil

}
