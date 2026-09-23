package system

import (
	"fmt"
	"os/exec"
	"strings"
	"sync"
)

type serviceInfo struct {
	Services []serviceItem
}

type serviceItem struct {
	Name        string
	Load        string
	ActiveState string
	SubState    string
	EnableState string
	Description string
	PID         string
}

var Services serviceInfo

var ServiceMU sync.RWMutex

func GetServices() {

	serviceList := exec.Command("systemctl", "list-units", "--type=service", "--no-legend", "--no-pager")
	out, err := serviceList.Output()

	list := []serviceItem{}

	if err != nil {
		fmt.Println(err)
		return
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")

	for _, service := range lines {

		parts := strings.Fields(service)

		if len(parts) < 5 {
			continue
		}

		serviceData, err := getServiceInfo(parts[0])
		if err != nil {
			fmt.Println(err)
			continue
		}

		enabled, err := isServiceEnabled(parts[0])
		if err != nil {
			fmt.Println(err)
			continue
		}

		s := serviceItem{
			Name:        parts[0],
			Load:        parts[1],
			ActiveState: parts[2],
			SubState:    parts[3],
			EnableState: enabled,
			Description: strings.Join(parts[4:], " "),
			PID:         serviceData["MainPID"],
		}

		list = append(list, s)

	}

	ServiceMU.Lock()
	Services = serviceInfo{
		Services: list,
	}
	ServiceMU.Unlock()

}

func getServiceInfo(name string) (map[string]string, error) {

	serviceInfo := map[string]string{}

	command := exec.Command("systemctl", "show", name)
	out, err := command.Output()
	if err != nil {
		return serviceInfo, err
	}

	fileData := string(out)
	lines := strings.Split(fileData, "\n")

	for _, line := range lines {

		parts := strings.SplitN(line, "=", 2)
		if len(parts) < 2 {
			parts = append(parts, "")
		}

		serviceInfo[parts[0]] = strings.Join(parts[1:], " ")
	}

	return serviceInfo, nil
}

func isServiceEnabled(name string) (string, error) {

	state := ""

	command := exec.Command("systemctl", "is-enabled", name)
	res, err := command.Output()
	if err != nil {
		return state, err
	}

	state = strings.TrimSpace(string(res))

	return state, nil

}
