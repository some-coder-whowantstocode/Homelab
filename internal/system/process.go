package system

import (
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
)

type processInfo struct {
	PID           int64
	PPID          int64
	Name          string
	Status        string
	TotalCPUUsage int64
	CPU           float64
	Memory        int64
	StartTime     int64
}

func getProcesses() ([]processInfo, error) {

	processes := []processInfo{}

	data, err := os.ReadDir("/proc")
	if err != nil {
		return processes, err
	}

	for _, d := range data {

		if !d.IsDir() {
			continue
		}

		_, err := strconv.Atoi(d.Name())

		if err != nil {
			continue
		}

		proc_status_map := parse_proc_pid_status("/proc/" + d.Name() + "/status")
		proc_stat_map := parse_proc_pid_stat("/proc/" + d.Name() + "/stat")

		if len(proc_status_map) == 0 || len(proc_stat_map) == 0 {
			continue
		}

		pid, err := strconv.Atoi(proc_status_map["Pid"])
		if err != nil {
			continue
		}

		ppid, err := strconv.Atoi(proc_status_map["PPid"])
		if err != nil {
			continue
		}

		if _, ok := proc_status_map["VmRSS"]; !ok {
			proc_status_map["VmRSS"] = "0"
		} else {
			tsize := proc_status_map["VmRSS"]
			tsizeParts := strings.SplitN(tsize, "kB", 2)
			if len(tsizeParts) != 2 {
				proc_status_map["VmRSS"] = "0"
			} else {
				memorySize, err := strconv.Atoi(strings.TrimSpace(tsizeParts[0]))

				if err != nil {
					proc_status_map["VmRSS"] = "0"
					fmt.Println(err.Error())
				} else {
					proc_status_map["VmRSS"] = strconv.Itoa(memorySize * 1024)
				}

			}
		}

		memory, err := strconv.Atoi(proc_status_map["VmRSS"])
		if err != nil {
			continue
		}

		utime, err := strconv.Atoi(proc_stat_map["utime"])
		if err != nil {
			continue
		}

		stime, err := strconv.Atoi(proc_stat_map["stime"])
		if err != nil {
			continue
		}

		starttime, err := strconv.Atoi(proc_stat_map["starttime"])
		if err != nil {
			continue
		}

		totalTime := utime + stime

		processes = append(processes, processInfo{
			PID:           int64(pid),
			PPID:          int64(ppid),
			Name:          proc_status_map["Name"],
			Memory:        int64(memory),
			Status:        proc_stat_map["state"],
			TotalCPUUsage: int64(totalTime),
			StartTime:     int64(starttime),
		})

	}

	return processes, nil

}

func parse_proc_pid_status(filepath string) map[string]string {

	contentMap := map[string]string{}

	fileContent, err := os.ReadFile(filepath)
	if err != nil {
		fmt.Println(err.Error())
		return contentMap
	}

	fileText := strings.TrimSpace(string(fileContent))
	fileTextArr := strings.Split(fileText, "\n")

	for _, line := range fileTextArr {

		lineParts := strings.SplitN(line, ":", 2)
		if len(lineParts) < 2 {
			continue
		}

		key := strings.TrimSpace(lineParts[0])
		value := strings.TrimSpace(lineParts[1])

		contentMap[key] = value
	}

	return contentMap
}

func parse_proc_pid_stat(filepath string) map[string]string {

	contentMap := map[string]string{}

	fileContent, err := os.ReadFile(filepath)
	if err != nil {
		fmt.Println(err.Error())
		return contentMap
	}

	fileText := strings.TrimSpace(string(fileContent))

	pattern := `^(\d+)\s+\((.*)\)\s+(.*)$`
	r := regexp.MustCompile(pattern)
	match := r.FindStringSubmatch(fileText)

	if len(match) != 4 {
		return contentMap
	}

	contentMap["pid"] = match[1]
	contentMap["comm"] = match[2]
	fileText = match[3]

	fileTextArr := strings.Fields(fileText)

	keys := []string{
		// "pid",
		// "comm",
		"state",
		"ppid",
		"pgrp",
		"session",
		"tty_nr",
		"tpgid",
		"flags",
		"minflt",
		"cminflt",
		"majflt",
		"cmajflt",
		"utime",
		"stime",
		"cutime",
		"cstime",
		"priority",
		"nice",
		"num_threads",
		"itrealvalue",
		"starttime",
		"vsize",
		"rss",
		"rsslim",
		"startcode",
		"endcode",
		"startstack",
		"kstkesp",
		"kstkeip",
		"signal",
		"blocked",
		"sigignore",
		"sigcatch",
		"wchan",
		"nswap",
		"cnswap",
		"exit_signal",
		"processor",
		"rt_priority",
		"policy",
		"delayacct_blkio_ticks",
		"guest_time",
		"cguest_time",
		"start_data",
		"end_data",
		"start_brk",
		"arg_start",
		"arg_end",
		"env_start",
		"env_end",
		"exit_code",
	}

	for i, part := range fileTextArr {

		if i >= len(keys) {
			break
		}

		value := strings.TrimSpace(part)

		key := keys[i]

		contentMap[key] = value
	}

	return contentMap
}
