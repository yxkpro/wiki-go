package ban

import (
    "encoding/json"
    "errors"
    "os"
    "path/filepath"
    "sync"
    "time"
)

// Attempt stores failure and ban information for a single key (e.g., IP address).
// All time values are persisted as Unix seconds for portability.
//
// Allowed public fields are intentionally exported to make JSON (un)marshalling simple.
// Do not modify them outside this package.
//
//   • Fails: consecutive failures within the current window (30 s)
//   • FirstFail: Unix time of the first failure in the current 30 s window
//   • BanUntil: Unix time until which this key is banned (0 if not banned)
//   • BanLen: length of the *last* ban applied; doubled each time another ban is triggered
//
// Zero value means no failures / no ban.
//
// NOTE: For now policy is fixed (3 fails ⇒ 1 min ban, doubling after each ban).
//       If we need configurability later we can add a Policy struct.
//
//       The window and thresholds are *not* persisted so changing them in code affects
//       subsequent behaviour without needing to wipe the file.
//
//go:generate go run golang.org/x/tools/cmd/stringer -type=Attempt
// (no-op – just a placeholder so "go generate" doesn't complain)
//
// – LeoMoon Wiki-Go
//
//
// Exponential ban growth stops at 24 h to avoid absurd lock-out times.
var (
    thresholdFails     = 5                    // allowed failures inside window
    windowDuration     = 180 * time.Second    // observation window
    initialBanDuration = 1 * time.Minute      // first ban length
    maxBanDuration     = 24 * time.Hour       // upper bound for exponential growth
)

type Attempt struct {
    Fails     int   `json:"fails"`
    FirstFail int64 `json:"firstFail"`
    BanUntil  int64 `json:"banUntil"`
    BanLen    int64 `json:"banLen"`
}

type BanList struct {
    mu       sync.Mutex
    entries  map[string]*Attempt
    filePath string
}

// NewBanList loads the ban list from disk (if present) and returns a ready-to-use instance.
// The caller must guarantee that only one process writes to filePath at a time.
func NewBanList(filePath string) (*BanList, error) {
    // Ensure directory exists
    if dir := filepath.Dir(filePath); dir != "" {
        if err := os.MkdirAll(dir, 0o755); err != nil {
            return nil, err
        }
    }

    bl := &BanList{
        entries:  make(map[string]*Attempt),
        filePath: filePath,
    }

    f, err := os.Open(filePath)
    if err != nil {
        if errors.Is(err, os.ErrNotExist) {
            return bl, nil // fresh list
        }
        return nil, err
    }
    defer f.Close()

    if err := json.NewDecoder(f).Decode(&bl.entries); err != nil {
        // Corrupted file – ignore and start fresh (but warn caller)
        return bl, err
    }

    return bl, nil
}

// IsBanned returns the remaining ban duration for the given key.
// If the duration is >0 the caller should *not* process the request further.
func (b *BanList) IsBanned(key string) time.Duration {
    b.mu.Lock()
    defer b.mu.Unlock()

    at, ok := b.entries[key]
    if !ok || at == nil {
        return 0
    }

    now := time.Now().Unix()
    if at.BanUntil > now {
        return time.Duration(at.BanUntil-now) * time.Second
    }

    // Ban expired – clear the timer but keep BanLen so that the next failure
    // escalates using the previous ban length. Resetting BanLen happens only
    // after a *successful* login via Clear().
    if at.BanUntil != 0 {
        at.BanUntil = 0
        // Do NOT reset BanLen here – keeps exponential growth.
        at.Fails = 0
        at.FirstFail = 0
        b.persistAsync()
    }
    return 0
}

// RegisterFailure records a failed attempt and returns (banDuration, bannedNow).
// bannedNow is true when this call caused a new ban or extended an existing one.
func (b *BanList) RegisterFailure(key string) (time.Duration, bool) {
    b.mu.Lock()
    defer b.mu.Unlock()

    now := time.Now()
    at, ok := b.entries[key]
    if !ok {
        at = &Attempt{}
        b.entries[key] = at
    }

    // If still banned, we are already locked.
    if at.BanUntil > now.Unix() {
        return time.Duration(at.BanUntil-now.Unix()) * time.Second, false
    }

    // Window handling: reset fails if window expired
    if at.FirstFail == 0 || now.Sub(time.Unix(at.FirstFail, 0)) > windowDuration {
        at.FirstFail = now.Unix()
        at.Fails = 1
    } else {
        at.Fails++
    }

    // Determine allowed failures before triggering a ban. After the first ban
    // (BanLen > 0), only *one* wrong attempt is allowed (i.e., allowedFails=0).
    allowedFails := thresholdFails
    if at.BanLen > 0 {
        allowedFails = 0
    }

    if at.Fails >= allowedFails {
        // Apply / extend ban
        if at.BanLen == 0 {
            at.BanLen = int64(initialBanDuration.Seconds())
        } else {
            at.BanLen *= 2
            if time.Duration(at.BanLen)*time.Second > maxBanDuration {
                at.BanLen = int64(maxBanDuration.Seconds())
            }
        }
        at.BanUntil = now.Unix() + at.BanLen
        at.Fails = 0
        at.FirstFail = 0

        b.persistAsync()
        return time.Duration(at.BanLen) * time.Second, true
    }

    b.persistAsync()
    return 0, false
}

// Clear removes ban/failure information for the key (called after successful login).
func (b *BanList) Clear(key string) {
    b.mu.Lock()
    defer b.mu.Unlock()

    delete(b.entries, key)
    b.persistAsync()
}

// persistAsync serialises the entries map in a goroutine so we don't block callers.
func (b *BanList) persistAsync() {
    // Make a snapshot to avoid holding the lock while encoding.
    snapshot := make(map[string]*Attempt, len(b.entries))
    for k, v := range b.entries {
        // Shallow copy is fine because Attempt is value type with no pointers besides itself.
        cp := *v
        snapshot[k] = &cp
    }

    go func(data map[string]*Attempt, path string) {
        tmp := path + ".tmp"
        f, err := os.Create(tmp)
        if err != nil {
            return // Best-effort: ignore on error
        }
        _ = json.NewEncoder(f).Encode(data)
        f.Close()
        _ = os.Rename(tmp, path) // atomic on POSIX
    }(snapshot, b.filePath)
}

// UpdatePolicy allows overriding the default login ban policy at runtime.
// Provide zero or negative values to keep current ones.
func UpdatePolicy(maxFails, windowSec, initialSec, maxSec int) {
    if maxFails > 0 {
        thresholdFails = maxFails
    }
    if windowSec > 0 {
        windowDuration = time.Duration(windowSec) * time.Second
    }
    if initialSec > 0 {
        initialBanDuration = time.Duration(initialSec) * time.Second
    }
    if maxSec > 0 {
        maxBanDuration = time.Duration(maxSec) * time.Second
    }
}