package api

import (
	"encoding/json"
	"fmt"
	"homelab/internal/system"
	"net/http"
)

func Service(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Access-Control-Allow-Origin", "http://localhost")
	w.Header().Set("Content-Type", "application/json")

	system.ServiceMU.RLock()
	response := system.Services
	system.ServiceMU.RUnlock()

	encoder := json.NewEncoder(w)
	err := encoder.Encode(response)
	if err != nil {
		fmt.Println("Failed to encode status: ", err)
	}
}
