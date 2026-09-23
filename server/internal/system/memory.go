package system

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

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
