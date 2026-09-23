package main

import (
	"fmt"
	"homelab/internal/api"
	"homelab/internal/system"
	"homelab/internal/utils"
	"net/http"
)

var cpuUsageTracker float64 = 0

func home(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Hello from my homelab server")
}

func main() {
	system.GetServices()

	utils.GetClockTick()

	go system.StoreStatus()

	http.HandleFunc("/", home)
	http.HandleFunc("/status", api.Status)
	http.HandleFunc("/service", api.Service)

	fmt.Println("HomeLab is running on: 8000")

	err := http.ListenAndServe("0.0.0.0:8000", nil)
	if err != nil {
		panic(err)
	}
}
