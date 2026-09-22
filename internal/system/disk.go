package system

import "syscall"

type diskInfo struct {
	Total     uint64
	Used      uint64
	Available uint64
	Free      uint64
	Usage     float64
}

func getDiskInfo() (diskInfo, error) {

	var statfs syscall.Statfs_t
	var diskinfo diskInfo

	err := syscall.Statfs("/", &statfs)
	if err != nil {
		return diskinfo, err
	}

	total := statfs.Blocks * uint64(statfs.Bsize)
	available := statfs.Bavail * uint64(statfs.Bsize)
	free := statfs.Bfree * uint64(statfs.Bsize)
	used := total - available

	var usage float64 = 0

	if total != 0 {
		usage = float64(used) / float64(total) * 100
	}

	diskinfo = diskInfo{
		Total:     total,
		Available: available,
		Free:      free,
		Used:      used,
		Usage:     usage,
	}

	return diskinfo, nil

}
