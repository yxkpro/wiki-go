#!/bin/bash
echo "Building Wiki-Go for multiple platforms..."

# Use vendored dependencies
export GOFLAGS=-mod=vendor

BUILD_DIR="build"
mkdir -p "$BUILD_DIR"

find "$BUILD_DIR" -mindepth 1 ! -name ".gitkeep" ! -path "$BUILD_DIR/data" ! -path "$BUILD_DIR/data/*" -delete

# Get version from git tag, fallback to "dev" if not available
VERSION=$(git describe --tags --always 2>/dev/null || echo "dev")
echo "Building version: $VERSION"

# Set ldflags for version
LDFLAGS="-X 'wiki-go/internal/version.Version=$VERSION'"

echo "Building for Linux (amd64)..."
GOOS=linux GOARCH=amd64 go build -ldflags "$LDFLAGS" -o $BUILD_DIR/wiki-go-linux-amd64 .

echo "Building for Linux (386)..."
GOOS=linux GOARCH=386 go build -ldflags "$LDFLAGS" -o $BUILD_DIR/wiki-go-linux-386 .

echo "Building for Linux (arm64)..."
GOOS=linux GOARCH=arm64 go build -ldflags "$LDFLAGS" -o $BUILD_DIR/wiki-go-linux-arm64 .

echo "Building for Linux ARMv5..."
GOOS=linux GOARCH=arm GOARM=5 go build -ldflags "$LDFLAGS" -o $BUILD_DIR/wiki-go-linux-armv5 .

echo "Building for Linux ARMv6..."
GOOS=linux GOARCH=arm GOARM=6 go build -ldflags "$LDFLAGS" -o $BUILD_DIR/wiki-go-linux-armv6 .

echo "Building for Linux ARMv7..."
GOOS=linux GOARCH=arm GOARM=7 go build -ldflags "$LDFLAGS" -o $BUILD_DIR/wiki-go-linux-armv7 .

echo "Building for Linux (s390x)..."
GOOS=linux GOARCH=s390x go build -ldflags "$LDFLAGS" -o $BUILD_DIR/wiki-go-linux-s390x .

echo "Building for Windows (amd64)..."
GOOS=windows GOARCH=amd64 go build -ldflags "$LDFLAGS" -o $BUILD_DIR/wiki-go-windows-amd64.exe .

echo "Building for Windows (arm64)..."
GOOS=windows GOARCH=arm64 go build -ldflags "$LDFLAGS" -o $BUILD_DIR/wiki-go-windows-arm64.exe .

echo "Building for macOS (amd64)..."
GOOS=darwin GOARCH=amd64 go build -ldflags "$LDFLAGS" -o $BUILD_DIR/wiki-go-mac-amd64 .

echo "Build complete! Packages are available in the '$BUILD_DIR' directory."