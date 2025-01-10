#!/bin/bash

# Function to check if MongoDB is ready
wait_for_mongodb() {
    echo "Waiting for MongoDB to be ready..."
    while ! docker exec mongodb mongosh --eval "db.runCommand({ping:1})" &>/dev/null; do
        sleep 1
    done
    echo "MongoDB is ready!"
}

# Function to create/clear collections
manage_collections() {
    echo "Creating/Clearing collections..."
    docker exec mongodb mongosh --eval '
        db = db.getSiblingDB("points");
        db.referrals.drop();
        db.createCollection("referrals");
        print("Collections have been reset successfully.");
    '
}

# Main script
case "$1" in
    start)
        echo "Starting MongoDB and creating collections..."
        docker compose up -d mongo
        wait_for_mongodb
        manage_collections
        echo "MongoDB is up and collections are created!"
        ;;
    restart)
        echo "Restarting MongoDB and clearing collections..."
        docker compose restart mongo
        wait_for_mongodb
        manage_collections
        echo "MongoDB restarted and collections cleared!"
        ;;
    stop)
        echo "Stopping MongoDB..."
        docker compose stop mongo
        echo "MongoDB stopped."
        ;;
    *)
        echo "Usage: $0 {start|restart|stop}"
        echo "Note: 'restart' will clear all collections."
        exit 1
        ;;
esac

exit 0