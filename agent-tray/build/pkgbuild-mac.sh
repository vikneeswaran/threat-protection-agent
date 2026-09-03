#!/bin/bash
#
# macOS Package Builder for Kuamini Security Client
# Creates a .pkg installer from the PyInstaller-built app bundle
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== macOS Package Builder ===${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$( dirname "$SCRIPT_DIR" )" )"
AGENT_ROOT="$( dirname "$SCRIPT_DIR" )"

# Prefer workflow env vars, but allow explicit fallback for compatibility
VERSION="${AGENT_VERSION:-${VERSION:-}}"
if [ -z "$VERSION" ]; then
  echo -e "${RED}Error: AGENT_VERSION or VERSION must be set by the workflow or environment.${NC}"
  exit 1
fi

ACCOUNT_ID="${ACCOUNT_ID:-}"

# Paths
APP_BUNDLE="${AGENT_ROOT}/dist/KuaminiSecurityClient.app"
BUILD_DIR="${SCRIPT_DIR}"
PACKAGE_DIR="${BUILD_DIR}/pkgtmp"
SCRIPTS_DIR="${PACKAGE_DIR}/scripts"
PAYLOAD_DIR="${PACKAGE_DIR}/payload"

OUTPUT_PKG="${BUILD_DIR}/KuaminiSecurityClient-${VERSION}.pkg"
echo -e "${GREEN}Using package version: ${VERSION}${NC}"
if [ -n "$ACCOUNT_ID" ]; then
  echo -e "${GREEN}Account ID: ${ACCOUNT_ID}${NC}"
fi

# Cleanup function
cleanup() {
  echo -e "${YELLOW}Cleaning up temporary directories...${NC}"
  rm -rf "$PACKAGE_DIR"
}
trap cleanup EXIT

echo -e "${YELLOW}Checking for app bundle...${NC}"
if [ ! -d "$APP_BUNDLE" ]; then
  echo -e "${RED}Error: App bundle not found at $APP_BUNDLE${NC}"
  echo "Please run PyInstaller first: pyinstaller KuaminiSecurityClient-mac.spec"
  exit 1
fi

echo -e "${GREEN}✓ Found app bundle: $APP_BUNDLE${NC}"

# Create package structure
echo -e "${YELLOW}Creating package structure...${NC}"
mkdir -p "$PAYLOAD_DIR/Applications"
mkdir -p "$SCRIPTS_DIR"

# Copy app bundle to payload
echo -e "${YELLOW}Copying app bundle to payload...${NC}"
cp -r "$APP_BUNDLE" "$PAYLOAD_DIR/Applications/"

# Create preinstall script
cat > "$SCRIPTS_DIR/preinstall" << 'EOF'
#!/bin/bash
echo "Preparing to install Kuamini Security Client..."
exit 0
EOF
chmod +x "$SCRIPTS_DIR/preinstall"

# Create postinstall script
cat > "$SCRIPTS_DIR/postinstall" << 'EOF'
#!/bin/bash
# Postinstall script for Kuamini Security Client
# Keep this tolerant of timing / permission issues.

APP_PATH="/Applications/KuaminiSecurityClient.app"
EXECUTABLE="$APP_PATH/Contents/MacOS/KuaminiSecurityClient"

echo "Setting executable permissions..."
if [ -f "$EXECUTABLE" ]; then
  chmod +x "$EXECUTABLE" 2>/dev/null || true
fi

if [ -d "$APP_PATH" ]; then
  /usr/bin/xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null || true
fi

echo "Installation complete!"
exit 0
EOF
chmod +x "$SCRIPTS_DIR/postinstall"

# Remove any quarantine attributes if they exist
if [ -d "$PAYLOAD_DIR/Applications/KuaminiSecurityClient.app" ]; then
  xattr -rd com.apple.quarantine "$PAYLOAD_DIR/Applications/KuaminiSecurityClient.app" 2>/dev/null || true
fi

# Build the package using pkgbuild
echo -e "${YELLOW}Building macOS package with pkgbuild...${NC}"
rm -f "$OUTPUT_PKG"

pkgbuild \
  --root "$PAYLOAD_DIR" \
  --scripts "$SCRIPTS_DIR" \
  --identifier "com.kuamini.securityclient" \
  --version "${VERSION}" \
  --ownership preserve \
  "$OUTPUT_PKG"

if [ ! -f "$OUTPUT_PKG" ]; then
  echo -e "${RED}Error: Failed to create package at $OUTPUT_PKG${NC}"
  exit 1
fi

# Optional helper package naming convention if you want to stage by account
if [ -n "$ACCOUNT_ID" ]; then
  echo -e "${YELLOW}Note: account-specific naming is usually handled by the server/download endpoint.${NC}"
fi

PKG_SIZE=$(du -h "$OUTPUT_PKG" | cut -f1)
echo -e "${GREEN}✓ Package created successfully!${NC}"
echo -e "${GREEN}  Location: $OUTPUT_PKG${NC}"
echo -e "${GREEN}  Size: $PKG_SIZE${NC}"

echo -e "${GREEN}=== Build Complete ===${NC}"
exit 0