package system

import (
	"fmt"
	"homelab/internal/utils"
	"sync"
	"time"
)

type systemStats struct {
	Uptime   float64
	Hostname string
	IP       string
	CPU      float64
	Memory   memInfo
	Disk     diskInfo
	Network  networkInfo
	Process  []processInfo
}

type lastProcInfo struct {
	CPU       int64
	StartTime int64
}

type memInfo struct {
	Total uint64
	Free  uint64
	Used  uint64
	Usage float64
}

var StatMU sync.RWMutex

var Stats systemStats

func StoreStatus() {

	var lastTotal int = 0
	var lastIdle int = 0
	var lastCpuUsage float64 = 0
	var lastRXBytes uint64
	var lastTXBytes uint64
	var lastProcesses map[int64]lastProcInfo = map[int64]lastProcInfo{}
	lastTime := time.Now()

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		getStatus(&lastTotal, &lastIdle, &lastCpuUsage, &lastRXBytes, &lastTXBytes, &lastProcesses, &lastTime)
		GetServices()
	}
}

func getStatus(lastTotal *int, lastIdle *int, lastCpuUsage *float64, lastRXBytes *uint64, lastTXBytes *uint64, lastProcesses *map[int64]lastProcInfo, lastTime *time.Time) {

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

	netData, err := getNetworkInfo()
	if err != nil {
		fmt.Println(err.Error())
	}

	if *lastRXBytes != 0 && *lastTXBytes != 0 {

		netData.RXRate = netData.RXBytes - *lastRXBytes
		netData.TXRate = netData.TXBytes - *lastTXBytes
	}

	*lastRXBytes = netData.RXBytes
	*lastTXBytes = netData.TXBytes

	processes, err := getProcesses()
	if err != nil {
		fmt.Println(err.Error())
	}

	if len(*lastProcesses) == 0 {
		for _, process := range processes {
			(*lastProcesses)[process.PID] = lastProcInfo{
				CPU:       process.TotalCPUUsage,
				StartTime: process.StartTime,
			}
		}

		*lastTime = time.Now()
	} else {

		currTime := time.Now()
		diff := currTime.Sub(*lastTime)

		processMap := map[int64]lastProcInfo{}

		for i, process := range processes {
			if _, ok := (*lastProcesses)[process.PID]; ok {

				if process.StartTime == (*lastProcesses)[process.PID].StartTime {

					lastCpuUsage := (*lastProcesses)[process.PID].CPU
					currCpuUsage := process.TotalCPUUsage

					total_usage := currCpuUsage - lastCpuUsage

					var cpuUsage float64 = 0

					cpuSeconds := float64(total_usage) / float64(utils.CLK_TCK)
					cpuUsage = (cpuSeconds / diff.Seconds()) * 100
					// fmt.Println(
					// 	"PID:", process.PID,
					// 	"prev:", lastCpuUsage,
					// 	"curr:", currCpuUsage,
					// 	"cpuSecs", cpuSeconds,
					// 	"delta:", total_usage,
					// 	"CLK:", CLK_TCK,
					// 	"elapsed:", diff.Seconds(),
					// 	"CPU:", cpuUsage,
					// )

					processes[i].CPU = cpuUsage

				}
			}
			processMap[process.PID] = lastProcInfo{
				CPU:       process.TotalCPUUsage,
				StartTime: process.StartTime,
			}
		}

		*lastProcesses = processMap
		*lastTime = currTime
	}

	StatMU.Lock()
	Stats = systemStats{
		Uptime:   uptime,
		Hostname: hostname,
		IP:       address,
		CPU:      cpuUsage,
		Memory:   meminfo,
		Disk:     diskInfo,
		Network:  netData,
		Process:  processes,
	}
	StatMU.Unlock()

}
