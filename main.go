package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

type systemStats struct {
	Uptime   float64
	Memory   float64
	Hostname string
	IP       string
	CPU      float64
	Disk     diskInfo
}

type diskInfo struct {
	Total     uint64
	Used      uint64
	Available uint64
	Free      uint64
	Usage     float64
}

func initStats() systemStats {
	return systemStats{
		Uptime:   0,
		Memory:   0,
		Hostname: "",
		IP:       "",
		CPU:      0,
		Disk:     diskInfo{},
	}
}

var statMU sync.RWMutex

var cpuUsageTracker float64 = 0

var stats systemStats = initStats()

func status(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Access-Control-Allow-Origin", "http://localhost")
	w.Header().Set("Content-Type", "application/json")

	statMU.RLock()
	response := stats
	statMU.RUnlock()

	encoder := json.NewEncoder(w)
	err := encoder.Encode(response)
	if err != nil {
		fmt.Println("Failed to encode status: ", err)
	}
	return
}

func home(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Hello from my homelab server")
}

func main() {

	go storeStatus()

	http.HandleFunc("/", home)
	http.HandleFunc("/status", status)

	fmt.Println("HomeLab is running on: 8000")

	err := http.ListenAndServe("0.0.0.0:8000", nil)
	if err != nil {
		panic(err)
	}
}
