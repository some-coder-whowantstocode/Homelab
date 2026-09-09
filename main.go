package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
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

type diskInfo struct {
	Total     uint64
	Used      uint64
	Available uint64
	Free      uint64
	Usage     float64
}

type memInfo struct {
	Total uint64
	Free  uint64
	Used  uint64
	Usage float64
}

type networkInfo struct {
	Interface string
	RXRate    uint64
	TXRate    uint64
	RXBytes   uint64
	TXBytes   uint64
	RXPackets uint64
	TXPackets uint64
	RXErrors  uint64
	TXErrors  uint64
	RXDrops   uint64
	TXDrops   uint64
}

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

var statMU sync.RWMutex

var cpuUsageTracker float64 = 0

var stats systemStats

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
