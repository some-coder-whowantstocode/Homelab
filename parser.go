package main

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

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
