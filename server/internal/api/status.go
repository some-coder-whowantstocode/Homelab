package api

import (
	"encoding/json"
	"fmt"
	"homelab/internal/system"
	"net/http"
)

func Status(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	system.StatMU.RLock()
	response := system.Stats
	system.StatMU.RUnlock()

	encoder := json.NewEncoder(w)
	err := encoder.Encode(response)
	if err != nil {
		fmt.Println("Failed to encode status: ", err)
	}
	return
}
