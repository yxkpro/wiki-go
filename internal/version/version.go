package version

import (
	"fmt"
	"time"
)

// Version is set at build time via ldflags
var Version = "dev"

// init adds timestamp to dev builds to prevent caching
func init() {
	// Only add timestamp to dev builds
	if Version == "dev" {
		Version = fmt.Sprintf("dev-%s", time.Now().Format("20060102-150405"))
	}
}