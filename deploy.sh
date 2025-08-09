#!/bin/bash

# Exit on error
set -e

# Configuration
REMOTE_HOST="lmoc1.dmz"
REMOTE_DIR="/opt/docker/wiki-go"
ZIP_FILE="documents.zip"

echo "Packaging documents folder..."
(cd demo-site-files && zip -r "../$ZIP_FILE" documents/ pages/ config.yaml)

echo "Transferring to $REMOTE_HOST..."
scp "$ZIP_FILE" "$REMOTE_HOST:~/"

echo "Deploying on remote server..."
ssh -T "$REMOTE_HOST" << EOF
  echo "Moving zip file to $REMOTE_DIR"
  sudo mv ~/$ZIP_FILE $REMOTE_DIR/

  echo "Changing to $REMOTE_DIR"
  cd $REMOTE_DIR

  echo "Extracting documents"
  sudo rm -rf $REMOTE_DIR/default/
  sudo unzip -o $ZIP_FILE -d $REMOTE_DIR/default/

  echo "Cleaning up"
  sudo rm $ZIP_FILE

  echo "Starting wiki-go service"
  sudo chown -R docker_limited:docker_limited $REMOTE_DIR/default/
  sudo -u docker_limited bash -c 'rm -rf /opt/docker/wiki-go/data/* && cp -r /opt/docker/wiki-go/default/* /opt/docker/wiki-go/data/'

  echo "Pulling latest Docker images"
  sudo docker compose pull
  sudo systemctl restart wiki-go

  echo "Deployment complete!"
EOF

echo "Cleaning up local files"
rm "$ZIP_FILE"

echo "Deployment process completed successfully!"
