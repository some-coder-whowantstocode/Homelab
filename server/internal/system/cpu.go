package system

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

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
