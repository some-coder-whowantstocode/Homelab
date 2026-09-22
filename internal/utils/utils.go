package utils

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

var CLK_TCK = 100

func ConvertStrToUint64(val string) uint64 {

	data, err := strconv.ParseUint(val, 10, 64)
	if err != nil {
		fmt.Println(err.Error())
		return 0
	}
	return data
}

func GetClockTick() {
	cmd := exec.Command("getconf", "CLK_TCK")

	CLK_TCK = 100

	output, err := cmd.Output()
	if err != nil {
		fmt.Println(err.Error())
	} else {
		outputText := strings.TrimSpace(string(output))
		outInt, err := strconv.Atoi(string(outputText))
		if err != nil {
			fmt.Println(err.Error())
		} else {
			CLK_TCK = outInt
		}
	}

}
